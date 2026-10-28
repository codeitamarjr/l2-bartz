/*
 * Bartz website bridge for L2J Server (High Five).
 *
 * The website never writes game data. It queues requests in l2web.game_actions; this script, running inside the
 * game server, picks them up every few seconds and applies them with the game's own code, so the server's
 * in-memory state and the database always agree (no duplicated or lost items).
 *
 * Actions:
 *   give_item  online and room in the bag -> straight into the inventory ("You have obtained ...")
 *              otherwise                  -> in-game system mail with the item attached (like the birthday gift)
 *   send_mail  always one in-game system mail with several items attached (the weekly gift box); the items
 *              column holds "itemId:count:enchant" entries joined by ";", the mail_* columns the subject and text
 *
 * Each row is claimed with an atomic UPDATE (pending -> processing) before anything is given, so a row can never be
 * delivered twice, even if the script is loaded twice after a scripts reload.
 */
package com.l2jserver.datapack.custom.WebBridge;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.l2jserver.commons.database.ConnectionFactory;
import com.l2jserver.gameserver.ThreadPoolManager;
import com.l2jserver.gameserver.data.sql.impl.CharNameTable;
import com.l2jserver.gameserver.datatables.ItemTable;
import com.l2jserver.gameserver.instancemanager.MailManager;
import com.l2jserver.gameserver.model.L2World;
import com.l2jserver.gameserver.model.actor.instance.L2PcInstance;
import com.l2jserver.gameserver.model.entity.Message;
import com.l2jserver.gameserver.model.items.L2Item;
import com.l2jserver.gameserver.model.items.instance.L2ItemInstance;

public final class WebBridge {

	private static final Logger LOG = LoggerFactory.getLogger(WebBridge.class);

	private static final long POLL_SECONDS = 5;

	private static final int BATCH_SIZE = 20;

	/** Non-stackable items create one item per unit; cap it so a typo can't flood a character. */
	private static final long MAX_NON_STACKABLE = 100;

	private static final String MAIL_SUBJECT = "A gift from Bartz";

	private static final String MAIL_TEXT = "The Bartz staff sent you this item. Take it from the attachment. Good hunting!";

	private static final String TABLE_EXISTS = "SELECT 1 FROM information_schema.tables WHERE table_schema = 'l2web' AND table_name = 'game_actions'";

	/** The client shows at most 8 attachments per mail. */
	private static final int MAX_ATTACHMENTS = 8;

	private static final String SELECT_PENDING = "SELECT id, action, character_id, item_id, count, enchant, items, mail_subject, mail_text FROM l2web.game_actions WHERE status = 'pending' ORDER BY id LIMIT " + BATCH_SIZE;

	private static final String CLAIM = "UPDATE l2web.game_actions SET status = 'processing', updated_at = NOW() WHERE id = ? AND status = 'pending'";

	private static final String FINISH = "UPDATE l2web.game_actions SET status = ?, result = ?, processed_at = NOW(), updated_at = NOW() WHERE id = ?";

	// Rows still 'processing' at startup were interrupted mid-delivery (crash, restart). They are not retried
	// automatically, because the item may already have been given: a GM checks and re-sends if needed.
	private static final String FAIL_INTERRUPTED = "UPDATE l2web.game_actions SET status = 'failed', result = 'Interrupted by a game server restart; check the character before sending again.', processed_at = NOW(), updated_at = NOW() WHERE status = 'processing'";

	private WebBridge() {
	}

	private record Action(long id, String action, int characterId, int itemId, long count, int enchant, String items, String mailSubject, String mailText) {
	}

	private record MailItem(L2Item template, long count, int enchant) {
	}

	private record Outcome(boolean done, String message) {
		static Outcome done(String message) {
			return new Outcome(true, message);
		}

		static Outcome failed(String message) {
			return new Outcome(false, message);
		}
	}

	public static void main(String[] args) {
		try (var con = ConnectionFactory.getInstance().getConnection();
			var ps = con.prepareStatement(TABLE_EXISTS);
			var rs = ps.executeQuery()) {
			if (!rs.next()) {
				LOG.info("WebBridge: l2web.game_actions not found, website bridge disabled.");
				return;
			}
			try (var fail = con.prepareStatement(FAIL_INTERRUPTED)) {
				final int interrupted = fail.executeUpdate();
				if (interrupted > 0) {
					LOG.warn("WebBridge: marked {} interrupted action(s) as failed.", interrupted);
				}
			}
		} catch (SQLException ex) {
			LOG.warn("WebBridge: could not reach the website database, bridge disabled.", ex);
			return;
		}

		ThreadPoolManager.getInstance().scheduleGeneralAtFixedRate(WebBridge::poll, 10, POLL_SECONDS, TimeUnit.SECONDS);
		LOG.info("WebBridge: processing website actions every {} seconds.", POLL_SECONDS);
	}

	private static void poll() {
		try (var con = ConnectionFactory.getInstance().getConnection()) {
			for (Action action : pending(con)) {
				if (!claim(con, action.id())) {
					continue; // Another poll already took it.
				}
				Outcome outcome;
				try {
					outcome = apply(action);
				} catch (Exception ex) {
					LOG.warn("WebBridge: action {} failed.", action.id(), ex);
					outcome = Outcome.failed("Error in the game server: " + ex.getMessage());
				}
				finish(con, action.id(), outcome);
				LOG.info("WebBridge: action {} {}: {}", action.id(), outcome.done() ? "done" : "failed", outcome.message());
			}
		} catch (Exception ex) {
			LOG.warn("WebBridge: polling failed.", ex);
		}
	}

	private static List<Action> pending(Connection con) throws SQLException {
		final List<Action> actions = new ArrayList<>();
		try (var ps = con.prepareStatement(SELECT_PENDING);
			var rs = ps.executeQuery()) {
			while (rs.next()) {
				actions.add(read(rs));
			}
		}
		return actions;
	}

	private static Action read(ResultSet rs) throws SQLException {
		return new Action(rs.getLong("id"), rs.getString("action"), rs.getInt("character_id"), rs.getInt("item_id"), rs.getLong("count"), rs.getInt("enchant"), rs.getString("items"), rs.getString("mail_subject"), rs.getString("mail_text"));
	}

	private static boolean claim(Connection con, long id) throws SQLException {
		try (PreparedStatement ps = con.prepareStatement(CLAIM)) {
			ps.setLong(1, id);
			return ps.executeUpdate() == 1;
		}
	}

	private static void finish(Connection con, long id, Outcome outcome) throws SQLException {
		try (PreparedStatement ps = con.prepareStatement(FINISH)) {
			ps.setString(1, outcome.done() ? "done" : "failed");
			ps.setString(2, outcome.message());
			ps.setLong(3, id);
			ps.executeUpdate();
		}
	}

	private static Outcome apply(Action action) {
		return switch (action.action()) {
			case "give_item" -> giveItem(action);
			case "send_mail" -> sendMail(action);
			default -> Outcome.failed("Unknown action '" + action.action() + "'.");
		};
	}

	/** One system mail with every item attached. Everything is checked before the mail is created. */
	private static Outcome sendMail(Action action) {
		final String characterName = CharNameTable.getInstance().getNameById(action.characterId());
		if (characterName == null) {
			return Outcome.failed("Character " + action.characterId() + " does not exist.");
		}
		final List<MailItem> items = new ArrayList<>();
		for (String entry : (action.items() == null ? "" : action.items()).split(";")) {
			if (entry.isBlank()) {
				continue;
			}
			final String[] parts = entry.trim().split(":");
			final int itemId;
			final long count;
			final int enchant;
			try {
				itemId = Integer.parseInt(parts[0]);
				count = parts.length > 1 ? Long.parseLong(parts[1]) : 1;
				enchant = parts.length > 2 ? Integer.parseInt(parts[2]) : 0;
			} catch (NumberFormatException ex) {
				return Outcome.failed("Bad item entry '" + entry + "'.");
			}
			final L2Item template = ItemTable.getInstance().getTemplate(itemId);
			if (template == null) {
				return Outcome.failed("Item " + itemId + " does not exist on this server.");
			}
			if ((count < 1) || (!template.isStackable() && (count > 1))) {
				return Outcome.failed(template.getName() + ": a mail can carry 1 of a non-stackable item, or a stack of a stackable one.");
			}
			items.add(new MailItem(template, count, template.isEquipable() ? Math.max(0, enchant) : 0));
		}
		if (items.isEmpty() || (items.size() > MAX_ATTACHMENTS)) {
			return Outcome.failed("A mail needs 1 to " + MAX_ATTACHMENTS + " items, got " + items.size() + ".");
		}

		final String subject = (action.mailSubject() == null) || action.mailSubject().isBlank() ? MAIL_SUBJECT : action.mailSubject();
		final String text = (action.mailText() == null) || action.mailText().isBlank() ? MAIL_TEXT : action.mailText();
		final Message mail = new Message(action.characterId(), subject, text, Message.SendBySystem.NEWS);
		final var attachments = mail.createAttachments();
		for (MailItem item : items) {
			if (attachments.addItem("WebBridge", item.template().getId(), item.count(), item.enchant(), null, null) == null) {
				return Outcome.failed("Could not attach " + item.template().getName() + " to the mail.");
			}
		}
		MailManager.getInstance().sendMessage(mail);
		return Outcome.done("Sent '" + subject + "' with " + items.size() + " item(s) to " + characterName + " by in-game mail.");
	}

	private static Outcome giveItem(Action action) {
		final L2Item template = ItemTable.getInstance().getTemplate(action.itemId());
		if (template == null) {
			return Outcome.failed("Item " + action.itemId() + " does not exist on this server.");
		}
		final String characterName = CharNameTable.getInstance().getNameById(action.characterId());
		if (characterName == null) {
			return Outcome.failed("Character " + action.characterId() + " does not exist.");
		}
		if (action.count() < 1) {
			return Outcome.failed("Count must be at least 1.");
		}
		if (!template.isStackable() && (action.count() > MAX_NON_STACKABLE)) {
			return Outcome.failed(template.getName() + " is not stackable; send at most " + MAX_NON_STACKABLE + " at once.");
		}
		final int enchant = template.isEquipable() ? Math.max(0, action.enchant()) : 0;
		final String what = action.count() + " x " + (enchant > 0 ? "+" + enchant + " " : "") + template.getName();

		final L2PcInstance player = L2World.getInstance().getPlayer(action.characterId());
		if ((player != null) && player.isOnline() && !player.isInOfflineMode()
			&& player.getInventory().validateCapacityByItemId(action.itemId(), action.count())
			&& player.getInventory().validateWeightByItemId(action.itemId(), action.count())) {
			final L2ItemInstance item = player.addItem("WebBridge", action.itemId(), action.count(), enchant, null, true);
			if (item != null) {
				return Outcome.done("Delivered " + what + " to " + characterName + "'s inventory (online).");
			}
		}

		final Message mail = new Message(action.characterId(), MAIL_SUBJECT, MAIL_TEXT, Message.SendBySystem.NEWS);
		final L2ItemInstance attached = mail.createAttachments().addItem("WebBridge", action.itemId(), action.count(), enchant, null, null);
		if (attached == null) {
			return Outcome.failed("Could not attach " + what + " to a mail.");
		}
		MailManager.getInstance().sendMessage(mail);
		return Outcome.done("Sent " + what + " to " + characterName + " by in-game mail" + (player != null ? " (bag full or too heavy)." : " (offline)."));
	}
}
