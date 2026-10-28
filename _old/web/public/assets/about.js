// About page: fills in live server data from the stats API (/api/status) every 30 seconds.
// Everything is written with textContent, so names coming from the game can't inject markup.
const REFRESH_MS = 30000;

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : n);
const el = (tag, className, text) => {
	const e = document.createElement(tag);
	if (className) e.className = className;
	if (text != null) e.textContent = text;
	return e;
};

const setStatus = (key, state) => {
	const card = document.querySelector(`[data-status="${key}"]`);
	card.classList.remove('is-online', 'is-offline', 'is-unknown');
	card.classList.add(state === true ? 'is-online' : state === false ? 'is-offline' : 'is-unknown');
	card.querySelector('.status-text').textContent = state === true ? 'Online' : state === false ? 'Offline' : 'Unknown';
};

const renderRaces = (races) => {
	const box = document.getElementById('race-bars');
	box.replaceChildren();
	const total = races.reduce((sum, r) => sum + r.count, 0);
	for (const race of races) {
		const pct = total ? Math.round((race.count / total) * 100) : 0;
		const row = el('div', 'race-bar');
		row.append(el('span', 'race-bar-name', race.name));
		const track = el('span', 'race-bar-track');
		const fill = el('span', 'race-bar-fill');
		fill.style.width = `${pct}%`;
		track.append(fill);
		row.append(track, el('span', 'race-bar-count', `${fmt(race.count)} · ${pct}%`));
		box.append(row);
	}
};

const renderRanking = (id, rows, valueOf) => {
	const list = document.getElementById(id);
	list.replaceChildren();
	if (!rows.length) {
		list.append(el('li', 'about-empty', 'No heroes yet. Be the first.'));
		return;
	}
	for (const row of rows) {
		const li = el('li', 'ranking-row');
		const who = el('span', 'ranking-name', row.name);
		who.append(el('span', 'ranking-meta', `${row.race} · Lv ${row.level}`));
		li.append(who, el('span', 'ranking-value text-gold', valueOf(row)));
		list.append(li);
	}
};

const renderCastles = (castles) => {
	const grid = document.getElementById('castle-grid');
	grid.replaceChildren();
	for (const c of castles) {
		const card = el('div', `castle${c.owner ? ' is-owned' : ''}`);
		card.append(el('p', 'castle-name', c.name), el('p', 'castle-owner', c.owner ?? 'Unclaimed'));
		grid.append(card);
	}
};

const render = (data) => {
	document.querySelectorAll('[data-field]').forEach((node) => {
		const value = get(data, node.dataset.field);
		if (value != null) node.textContent = fmt(value);
	});
	document.querySelectorAll('[data-rate]').forEach((node) => {
		const value = data.rates?.[node.dataset.rate];
		if (value != null) node.textContent = `x${value}`;
	});
	setStatus('login', data.status?.login);
	setStatus('game', data.status?.game);
	if (data.races) renderRaces(data.races);
	if (data.top) {
		renderRanking('top-level', data.top.level, (r) => `Lv ${r.level}`);
		renderRanking('top-pvp', data.top.pvp, (r) => fmt(r.pvp));
	}
	if (data.castles) renderCastles(data.castles);
	const time = new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	document.getElementById('updated').textContent = data.status?.database === false
		? `Updated ${time} · world statistics temporarily unavailable`
		: `Updated ${time}`;
};

const refresh = async () => {
	try {
		const res = await fetch('/api/status', { cache: 'no-store' });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		render(await res.json());
	} catch {
		// The API (or the whole stack) is down: say so instead of showing stale "Online" badges.
		setStatus('login', null);
		setStatus('game', null);
		document.getElementById('updated').textContent = 'Live status is unavailable right now. Showing the configured rates.';
	}
};

refresh();
setInterval(() => {
	if (!document.hidden) refresh();
}, REFRESH_MS);
document.addEventListener('visibilitychange', () => {
	if (!document.hidden) refresh();
});
