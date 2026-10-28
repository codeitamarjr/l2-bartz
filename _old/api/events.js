// "Happening now": live state of epic bosses, raid bosses, castle sieges, the Grand Olympiad, the Seven Signs and
// Team vs Team, read from the game database and config, each with a lore-flavoured headline.
//   GET /api/events -> { generatedAt, live, events: [...] }  (sorted: live, soon, scheduled, ready, slain)
// Event: { id, category, title, place, state, headline, detail, startsAt, endsAt, returnsAt }
//   state: live (happening now) | soon (< 24 h) | scheduled | ready (waiting for heroes) | slain (returns later)
import fs from 'node:fs';
import path from 'node:path';

const gamedata = JSON.parse(fs.readFileSync(new URL('./data/gamedata.json', import.meta.url), 'utf8'));
const CONFIG_DIR = process.env.CONFIG_DIR ?? '/config';
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// Game config: the override file if it sets the key, else L2J's default (the game server merges the same way).
const readProps = (file) => {
	try {
		const props = {};
		for (const line of fs.readFileSync(path.join(CONFIG_DIR, file), 'utf8').split('\n')) {
			const m = line.match(/^\s*([A-Za-z0-9_.]+)\s*=\s*(.*?)\s*$/);
			if (m) props[m[1]] = m[2];
		}
		return props;
	} catch {
		return {};
	}
};
const config = () => {
	const siege = readProps('siege.properties');
	const oly = readProps('olympiad.properties');
	const tvt = readProps('tvt.properties');
	return {
		siegeLengthMs: Number(siege.SiegeLength ?? 120) * 60 * 1000,
		olyStartHour: Number(oly.StartHour ?? 18),
		olyStartMinute: Number(oly.StartMinute ?? 0),
		olyCompetitionMs: Number(oly.CompetitionPeriod ?? 21600000),
		tvtEnabled: String(tvt.Enabled ?? 'False').toLowerCase() === 'true',
		tvtTimes: String(tvt.Interval ?? '9:00,15:00,21:00,3:00').split(',').map((t) => t.trim()).filter(Boolean),
		tvtParticipationMs: Number(tvt.ParticipationTime ?? 30) * 60 * 1000,
		tvtRunningMs: Number(tvt.RunningTime ?? 20) * 60 * 1000,
	};
};

// Epic bosses: grandboss_data.status meanings come from each boss's AI script in the datapack.
const EPIC = {
	29068: {
		place: 'Antharas\' Lair, Dragon Valley', fourState: true,
		ready: 'The Earth Dragon sleeps beneath Dragon Valley, waiting for Shilen\'s return. Who dares to wake him?',
		gathering: 'Heroes have entered Antharas\' Lair. The ground of Dragon Valley trembles as the Earth Dragon stirs.',
		fighting: 'Antharas has awoken! The battle for Dragon Valley rages right now.',
		slain: 'Antharas has fallen. The earth is quiet... for now.',
	},
	29028: {
		place: 'Hall of Flames, Forge of the Gods', fourState: true,
		ready: 'Valakas slumbers in the Forge of the Gods. The fires burn hotter every day.',
		gathering: 'Valakas awakens! Heroes are gathering at the Hall of Flames. Entry closes soon.',
		fighting: 'The Fire Dragon is unleashed! The Hall of Flames burns as heroes fight for their lives.',
		slain: 'Valakas has been slain. The Forge of the Gods falls silent.',
	},
	29020: {
		place: 'Tower of Insolence', fourState: true,
		ready: 'Emperor Baium sleeps sealed at the top of the Tower of Insolence. Only the bold will wake him.',
		gathering: 'Baium stirs! Someone has disturbed the emperor at the top of the Tower of Insolence.',
		fighting: 'Emperor Baium is awake and enraged. The Tower of Insolence shakes with battle!',
		slain: 'Baium has fallen once more. His throne at the top of the tower stands empty.',
	},
	29118: {
		place: 'Beleth\'s Throne, Hellbound', fourState: true,
		ready: 'Beleth waits on his throne in Hellbound. The cursed island whispers his name.',
		gathering: 'The seal on Beleth\'s Throne weakens. Heroes gather on Hellbound.',
		fighting: 'Beleth has risen! Hellbound burns as the demon fights for his throne.',
		slain: 'Beleth has been cast down. Hellbound breathes again.',
	},
	29001: {
		place: 'Ant Nest, Dion',
		ready: 'Queen Ant rules her nest beneath Dion. Her brood grows every hour.',
		slain: 'Queen Ant has been slain. Her nest lies leaderless.',
	},
	29006: {
		place: 'Cruma Tower, Dion',
		ready: 'Core hums deep inside Cruma Tower, guarded by its ancient machines.',
		slain: 'Core has been destroyed. Cruma Tower is silent.',
	},
	29014: {
		place: 'Sea of Spores, Oren',
		ready: 'Orfen, the Nightmare Kraken, haunts the Sea of Spores.',
		slain: 'Orfen has been slain. The Sea of Spores is calm for a while.',
	},
};

// Prestige order: the landing page shows the first ones when several bosses share a state.
// (A list, because JavaScript always orders number-like object keys ascending.)
const EPIC_ORDER = [29068, 29028, 29020, 29118, 29001, 29006, 29014];

const SEVEN_SIGNS_PERIODS = ['Recruitment', 'Competition', 'Results', 'Seal Validation'];

// The current or next daily window that starts at hour:minute (server time zone, TZ env, same as the game) and lasts
// lengthMs. Checks yesterday's window too, for windows that run past midnight.
const dailyWindow = (now, hour, minute, lengthMs) => {
	for (const dayOffset of [-1, 0, 1]) {
		const d = new Date(now);
		d.setDate(d.getDate() + dayOffset);
		d.setHours(hour, minute, 0, 0);
		if (d.getTime() + lengthMs > now) return { start: d.getTime(), end: d.getTime() + lengthMs };
	}
	return null;
};
const iso = (ms) => (ms ? new Date(ms).toISOString() : null);
const scheduleState = (now, start, end) => {
	if (now >= start && now < end) return 'live';
	return start - now < DAY ? 'soon' : 'scheduled';
};

const epicBosses = (rows, now) => rows.filter((r) => EPIC[r.boss_id]).map((r) => {
	const lore = EPIC[r.boss_id];
	const [name, level] = gamedata.bosses[r.boss_id] ?? [`Boss ${r.boss_id}`, null];
	const status = Number(r.status);
	const respawn = Number(r.respawn_time);
	const dead = lore.fourState ? status === 3 : status === 1;
	let state = 'ready';
	let headline = lore.ready;
	if (dead && respawn > now) {
		state = 'slain';
		headline = lore.slain;
	} else if (lore.fourState && status === 1) {
		state = 'live';
		headline = lore.gathering;
	} else if (lore.fourState && status === 2) {
		state = 'live';
		headline = lore.fighting;
	}
	return {
		id: `epic-${r.boss_id}`,
		category: 'epic',
		priority: EPIC_ORDER.indexOf(Number(r.boss_id)),
		title: name,
		level,
		place: lore.place,
		state,
		headline,
		detail: state === 'live' ? (status === 1 ? 'Challengers are entering the lair' : 'Battle in progress')
			: state === 'slain' ? 'Returns' : 'Awaits challengers',
		returnsAt: state === 'slain' ? iso(respawn) : null,
	};
});

const raidBosses = (rows, now) => {
	const alive = rows.filter((r) => Number(r.respawn_time) <= now);
	const slain = rows.filter((r) => Number(r.respawn_time) > now)
		.sort((a, b) => Number(a.respawn_time) - Number(b.respawn_time));
	const events = [{
		id: 'raids-roaming',
		category: 'raid',
		title: 'Raid Bosses',
		place: 'All across Aden',
		state: alive.length ? 'ready' : 'slain',
		headline: `${alive.length} of ${rows.length} raid bosses roam the lands of Aden. Gather your party and claim their treasures.`,
		detail: `${alive.length} roaming`,
		count: { alive: alive.length, total: rows.length },
	}];
	// The next five to return: the ones players will race for.
	for (const r of slain.slice(0, 5)) {
		const [name, level] = gamedata.bosses[r.boss_id] ?? [`Raid Boss ${r.boss_id}`, null];
		events.push({
			id: `raid-${r.boss_id}`,
			category: 'raid',
			title: name,
			level,
			place: 'Raid Boss',
			state: 'slain',
			headline: `${name} was slain by brave adventurers. It will return, and the race for its treasure begins again.`,
			detail: 'Returns',
			returnsAt: iso(Number(r.respawn_time)),
		});
	}
	return events;
};

const sieges = (rows, now, cfg) => {
	// Group castles that share a siege time ("Sieges of Aden, Dion and Giran").
	const byTime = new Map();
	for (const c of rows) {
		const start = Math.floor(Number(c.siegeDate) / 60000) * 60000; // L2J adds a few ms per castle
		if (!start) continue;
		const end = start + cfg.siegeLengthMs;
		if (end <= now) continue;
		byTime.set(start, [...(byTime.get(start) ?? []), c]);
	}
	return [...byTime.entries()].sort(([a], [b]) => a - b).map(([start, castles]) => {
		const names = castles.map((c) => c.name);
		const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
		const owners = castles.filter((c) => c.clan).map((c) => `${c.clan} holds ${c.name}`);
		const end = start + cfg.siegeLengthMs;
		const state = scheduleState(now, start, end);
		return {
			id: `siege-${start}`,
			category: 'siege',
			title: names.length > 1 ? `Sieges of ${list}` : `Siege of ${list}`,
			place: names.length > 1 ? `${names.length} castles` : `${list} Castle`,
			state,
			headline: state === 'live'
				? `The Siege of ${list} rages! Banners clash at the castle walls. Join your clan and claim the throne.`
				: `War drums sound across Aden. Clans gather their banners for the Siege of ${list}.`,
			detail: owners.length ? owners.join(' · ') : 'Every castle is unclaimed. Any clan can take a throne.',
			startsAt: iso(start),
			endsAt: iso(end),
		};
	});
};

const olympiad = (row, now, cfg) => {
	if (!row) return [];
	const period = Number(row.period);
	if (period === 1) {
		return [{
			id: 'olympiad', category: 'olympiad', title: 'Grand Olympiad', place: 'Olympiad Stadium', state: 'live',
			headline: 'The Olympiad season has ended. The new Heroes of Aden are being crowned!',
			detail: 'Hero validation',
			endsAt: iso(Number(row.validation_end) || null),
		}];
	}
	// Competition period: the arena opens every day at StartHour:StartMinute for CompetitionPeriod.
	const { start, end } = dailyWindow(now, cfg.olyStartHour, cfg.olyStartMinute, cfg.olyCompetitionMs);
	const state = scheduleState(now, start, end);
	return [{
		id: 'olympiad',
		category: 'olympiad',
		title: 'Grand Olympiad',
		place: 'Olympiad Stadium',
		state,
		headline: state === 'live'
			? 'The Olympiad arena is open! Prove you are the best of your class and fight for the title of Hero.'
			: 'The Olympiad Stadium will open its gates tonight. Noblesse, sharpen your blades.',
		detail: 'Daily matches for Noblesse',
		startsAt: iso(start),
		endsAt: iso(end),
	}];
};

const sevenSigns = (row) => {
	if (!row) return [];
	const period = Number(row.active_period);
	const dawn = Number(row.dawn_stone_score) + Number(row.dawn_festival_score);
	const dusk = Number(row.dusk_stone_score) + Number(row.dusk_festival_score);
	const lead = dawn === dusk ? 'Dawn and Dusk stand even' : dawn > dusk ? 'the Lords of Dawn lead' : 'the Revolutionaries of Dusk lead';
	const headlines = [
		'The Seven Signs call for followers. Choose Dawn or Dusk before the competition begins.',
		`The war of the Seven Signs rages in the Necropolis and Catacombs: ${lead}.`,
		`The Seven Signs competition is over: ${lead}. The seals are being decided.`,
		'The seals of the Seven Signs are in force. Their power shapes Aden this week.',
	];
	return [{
		id: 'seven-signs',
		category: 'sevensigns',
		title: `Seven Signs: ${SEVEN_SIGNS_PERIODS[period] ?? 'Unknown'}`,
		place: 'Necropolis and Catacombs',
		state: period === 1 ? 'live' : 'scheduled',
		headline: headlines[period] ?? headlines[1],
		detail: `Dawn ${dawn.toLocaleString('en-US')} · Dusk ${dusk.toLocaleString('en-US')}`,
		score: { dawn, dusk },
	}];
};

const teamVsTeam = (now, cfg) => {
	if (!cfg.tvtEnabled || !cfg.tvtTimes.length) return [];
	// The event opens registration at each Interval time, then fights for RunningTime.
	const length = cfg.tvtParticipationMs + cfg.tvtRunningMs;
	const { start, end } = cfg.tvtTimes
		.map((t) => t.split(':').map(Number))
		.map(([h, m]) => dailyWindow(now, h, m || 0, length))
		.sort((a, b) => a.start - b.start)[0];
	const state = scheduleState(now, start, end);
	const registering = state === 'live' && now < start + cfg.tvtParticipationMs;
	return [{
		id: 'tvt',
		category: 'tvt',
		title: 'Team vs Team',
		place: 'Coliseum',
		state,
		headline: state !== 'live' ? 'Two teams, one arena. The next Team vs Team battle is coming.'
			: registering ? 'Team vs Team registration is open! Join now and fight for glory.'
			: 'Team vs Team is underway! Two teams clash in the arena.',
		detail: registering ? 'Registration open' : state === 'live' ? 'Battle in progress' : 'Next battle',
		startsAt: iso(start),
		endsAt: iso(end),
	}];
};

const ORDER = { live: 0, soon: 1, scheduled: 2, ready: 3, slain: 4 };
const time = (e) => Date.parse(e.startsAt ?? e.returnsAt ?? '') || Infinity;

export const loadEvents = async (pool) => {
	const q = async (sql) => (await pool.query(sql))[0];
	const now = Date.now();
	const cfg = config();
	const [bosses, raids, castles, [oly], [signs]] = await Promise.all([
		q('SELECT boss_id, status, respawn_time FROM l2jgs.grandboss_data'),
		q('SELECT boss_id, respawn_time FROM l2jgs.raidboss_spawnlist'),
		q('SELECT c.name, c.siegeDate, cd.clan_name AS clan FROM l2jgs.castle c LEFT JOIN l2jgs.clan_data cd ON cd.hasCastle = c.id'),
		q('SELECT period, olympiad_end, validation_end FROM l2jgs.olympiad_data LIMIT 1'),
		q('SELECT * FROM l2jgs.seven_signs_status LIMIT 1'),
	]);
	const events = [
		...epicBosses(bosses, now),
		...sieges(castles, now, cfg),
		...olympiad(oly, now, cfg),
		...sevenSigns(signs),
		...teamVsTeam(now, cfg),
		...raidBosses(raids, now),
	].sort((a, b) => (ORDER[a.state] - ORDER[b.state]) || (time(a) - time(b)) || ((a.priority ?? 99) - (b.priority ?? 99)));
	return { generatedAt: new Date(now).toISOString(), live: events.filter((e) => e.state === 'live').length, events };
};
