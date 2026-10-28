// "Happening now": fetches /api/events and fills
//   [data-events="compact"]  landing page: live + upcoming highlights (max 6) and a link to the full list
//   [data-events="full"]     About page: everything
//   [data-events-pill]       a "LIVE NOW" / "Starting soon" pill (landing hero)
// Countdowns tick every second; data refreshes every 30 seconds. All text is set with textContent.
(() => {
	const REFRESH_MS = 30000;
	const containers = [...document.querySelectorAll('[data-events]')];
	const pill = document.querySelector('[data-events-pill]');
	if (!containers.length && !pill) return;

	const CATEGORY = { epic: 'Epic Boss', raid: 'Raid Boss', siege: 'Castle Siege', olympiad: 'Olympiad', sevensigns: 'Seven Signs', tvt: 'Event' };
	const BADGE = { live: 'Live', soon: 'Soon', scheduled: 'Scheduled', ready: 'Awaits', slain: 'Slain' };

	const el = (tag, className, text) => {
		const e = document.createElement(tag);
		if (className) e.className = className;
		if (text != null) e.textContent = text;
		return e;
	};

	const span = (ms) => {
		const s = Math.max(0, Math.floor(ms / 1000));
		const d = Math.floor(s / 86400);
		const h = Math.floor((s % 86400) / 3600);
		const m = Math.floor((s % 3600) / 60);
		if (d) return `${d}d ${h}h`;
		if (h) return `${h}h ${m}m`;
		return `${m}m ${s % 60}s`;
	};
	const when = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

	// What a countdown line says for an event right now (re-evaluated every second).
	const countdown = (e, now) => {
		if (e.state === 'live' && e.endsAt) return `Ends in ${span(Date.parse(e.endsAt) - now)}`;
		if (e.state === 'live') return 'Happening now';
		if (e.startsAt) {
			const ms = Date.parse(e.startsAt) - now;
			return ms > 0 ? `Starts in ${span(ms)} · ${when(e.startsAt)}` : 'Starting now';
		}
		if (e.returnsAt) {
			const ms = Date.parse(e.returnsAt) - now;
			return ms > 0 ? `Returns in ${span(ms)}` : 'Returning now';
		}
		return e.detail ?? '';
	};

	let events = [];
	const ticking = []; // [node, event]

	const card = (e, featured) => {
		const article = el('article', `event-card is-${e.state}${featured ? ' is-featured' : ''}`);
		const top = el('div', 'event-top');
		top.append(el('span', `event-badge badge-${e.state}`, BADGE[e.state] ?? e.state), el('span', 'event-category', CATEGORY[e.category] ?? e.category));
		const title = el('h3', 'event-title', e.title);
		if (e.level) title.append(el('span', 'event-level', ` Lv ${e.level}`));
		article.append(top, title, el('p', 'event-place', e.place ?? ''), el('p', 'event-headline', e.headline));
		if (e.detail && (e.startsAt || e.returnsAt || e.state === 'live')) article.append(el('p', 'event-detail', e.detail));
		const timer = el('p', 'event-countdown', countdown(e, Date.now()));
		ticking.push([timer, e]);
		article.append(timer);
		return article;
	};

	const render = () => {
		ticking.length = 0;
		for (const box of containers) {
			const full = box.dataset.events === 'full';
			const list = box.querySelector('.events-list') ?? box;
			list.replaceChildren();
			// Landing: live and starting-soon first, then the most interesting upcoming items, max 6.
			const shown = full ? events : events.filter((e) => e.state !== 'slain' || e.category === 'epic').slice(0, 6);
			if (!shown.length) {
				list.append(el('p', 'about-empty', 'The realm is quiet. Check back soon.'));
				continue;
			}
			shown.forEach((e, i) => list.append(card(e, i === 0 && e.state === 'live')));
			box.hidden = false;
		}
		if (pill) {
			const live = events.filter((e) => e.state === 'live');
			const soon = events.find((e) => e.state === 'soon');
			const top = live[0] ?? soon;
			if (!top) {
				pill.hidden = true;
			} else {
				pill.replaceChildren(
					el('span', `pill-dot${live.length ? ' is-live' : ''}`),
					el('span', 'pill-label', live.length ? 'Live now' : 'Starting soon'),
					el('span', 'pill-text', live.length > 1 ? `${top.title} +${live.length - 1} more` : top.title),
				);
				pill.hidden = false;
			}
		}
	};

	const tick = () => {
		const now = Date.now();
		for (const [node, e] of ticking) node.textContent = countdown(e, now);
	};

	const refresh = async () => {
		try {
			const res = await fetch('/api/events', { cache: 'no-store' });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			events = (await res.json()).events;
			render();
		} catch {
			// Landing: hide the section when there is no live data. About: say so.
			for (const box of containers) {
				if (box.dataset.eventsOptional !== undefined) {
					box.hidden = true;
				} else {
					(box.querySelector('.events-list') ?? box).replaceChildren(el('p', 'about-empty', 'Live events are unavailable right now.'));
				}
			}
			if (pill) pill.hidden = true;
		}
	};

	refresh();
	setInterval(tick, 1000);
	setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
	document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
