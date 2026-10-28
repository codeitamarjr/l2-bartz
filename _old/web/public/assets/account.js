// Player area: sign in, list characters, show a character's status and items.
// All text from the server is written with textContent, so names can't inject markup.
const $ = (id) => document.getElementById(id);
const fmt = (n) => Number(n).toLocaleString('en-US');
const el = (tag, className, text) => {
	const e = document.createElement(tag);
	if (className) e.className = className;
	if (text != null) e.textContent = text;
	return e;
};

const api = async (path, options = {}) => {
	const res = await fetch(`/api/${path}`, {
		credentials: 'same-origin',
		...options,
		headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw Object.assign(new Error(body.error ?? `HTTP ${res.status}`), { status: res.status });
	return body;
};

let current = null; // the character being shown
let itemsTab = 'equipped';

const show = (section) => {
	$('signin').hidden = section !== 'signin';
	$('dashboard').hidden = section !== 'dashboard';
};

const showSignIn = () => {
	$('account-title').textContent = 'Your Account';
	$('account-tagline').textContent = 'Sign in with your game account to see your characters, their status and items.';
	$('insecure-note').hidden = location.protocol === 'https:';
	show('signin');
	document.querySelector('#signin-form [name=login]').focus();
};

const duration = (seconds) => {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return h ? `${fmt(h)}h ${m}m` : `${m}m`;
};
const date = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');

const renderCharacterList = (characters) => {
	const list = $('char-list');
	list.replaceChildren();
	$('no-chars').hidden = characters.length > 0;
	for (const c of characters) {
		const card = el('button', 'char-card');
		card.type = 'button';
		card.setAttribute('role', 'listitem');
		card.dataset.id = c.id;
		const top = el('span', 'char-card-top');
		top.append(el('span', `char-dot${c.online ? ' is-online' : ''}`), el('span', 'char-card-state', c.online ? 'Online' : `Last seen ${date(c.lastSeen)}`));
		card.append(
			top,
			el('span', 'char-card-name', c.name),
			el('span', 'char-card-class', `${c.className} · Lv ${c.level}`),
			el('span', 'char-card-meta', [c.race, c.clan ? `Clan ${c.clan}` : null, c.noblesse ? 'Noblesse' : null].filter(Boolean).join(' · ')),
		);
		card.addEventListener('click', () => openCharacter(c.id));
		list.append(card);
	}
};

const setBar = (name, current, max, label) => {
	const pct = max ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
	$(`cd-${name}-bar`).style.width = `${pct}%`;
	$(`cd-${name}`).textContent = label ?? `${fmt(current)} / ${fmt(max)}`;
};

const renderStats = (c) => {
	const s = c.status;
	const stats = [
		['Skill Points', fmt(s.sp)],
		['Adena', fmt(c.adena)],
		['PvP', fmt(s.pvp)],
		['PK', fmt(s.pk)],
		['Karma', fmt(s.karma)],
		['Fame', fmt(s.fame)],
		['Vitality', fmt(s.vitality)],
		['Time Played', duration(s.onlineSeconds)],
		['Created', date(s.created)],
		['Last Seen', c.online ? 'Online now' : date(c.lastSeen)],
	];
	const dl = $('cd-stats');
	dl.replaceChildren();
	for (const [label, value] of stats) {
		const div = el('div', 'char-stat');
		div.append(el('dt', null, label), el('dd', null, value));
		dl.append(div);
	}
};

const renderItems = () => {
	if (!current) return;
	const rows = current.items[itemsTab];
	const term = $('items-search').value.trim().toLowerCase();
	const shown = term ? rows.filter((i) => i.name.toLowerCase().includes(term)) : rows;
	$('items-first-col').textContent = itemsTab === 'equipped' ? 'Slot' : 'Type';
	const body = $('items-body');
	body.replaceChildren();
	if (!shown.length) {
		const tr = el('tr');
		const td = el('td', 'about-empty', term ? 'No items match your search.' : 'Nothing here yet.');
		td.colSpan = 4;
		tr.append(td);
		body.append(tr);
		return;
	}
	for (const item of shown) {
		const tr = el('tr');
		const name = el('td', `item-name item-${item.type.toLowerCase()}`);
		if (item.enchant) name.append(el('span', 'item-enchant', `+${item.enchant} `));
		name.append(document.createTextNode(item.name));
		const grade = el('td');
		if (item.grade) grade.append(el('span', `grade grade-${item.grade.toLowerCase()}`, item.grade));
		tr.append(
			el('td', 'item-slot', itemsTab === 'equipped' ? item.slot : ({ EtcItem: 'Item' }[item.type] ?? item.type)),
			name,
			grade,
			el('td', 'num', fmt(item.count)),
		);
		body.append(tr);
	}
};

const openCharacter = async (id) => {
	document.querySelectorAll('.char-card').forEach((card) => card.classList.toggle('is-selected', Number(card.dataset.id) === id));
	try {
		current = await api(`characters/${id}`);
	} catch (err) {
		if (err.status === 401) return showSignIn();
		throw err;
	}
	const c = current;
	$('cd-class').textContent = [c.className, c.baseClassName ? `(base: ${c.baseClassName})` : null].filter(Boolean).join(' ');
	$('cd-name').textContent = c.name;
	$('cd-sub').textContent = [c.title ? `“${c.title}”` : null, `${c.sex} ${c.race}`, c.clan ? `Clan ${c.clan}${c.clanLevel != null ? ` (Lv ${c.clanLevel})` : ''}` : 'No clan', c.noblesse ? 'Noblesse' : null, c.gm ? 'Game Master' : null].filter(Boolean).join(' · ');
	$('cd-level').textContent = c.level;
	const s = c.status;
	setBar('cp', s.cp.current, s.cp.max);
	setBar('hp', s.hp.current, s.hp.max);
	setBar('mp', s.mp.current, s.mp.max);
	setBar('xp', s.expPercent, 100, `${s.expPercent.toFixed(2)}%`);
	renderStats(c);
	for (const key of ['equipped', 'inventory', 'warehouse']) $(`count-${key}`).textContent = `(${c.items[key].length})`;
	renderItems();
	$('char-detail').hidden = false;
	localStorageSet('lastCharacter', String(id));
};

const localStorageGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const localStorageSet = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } };

const loadDashboard = async () => {
	let data;
	try {
		data = await api('me');
	} catch (err) {
		if (err.status === 401) return showSignIn();
		$('account-tagline').textContent = 'The player area is unavailable right now. Please try again later.';
		return show('none');
	}
	$('account-title').textContent = `Welcome, ${data.account.login}`;
	$('account-tagline').textContent = 'Your heroes of Aden.';
	$('account-login').textContent = data.account.login;
	$('account-gm').hidden = !data.account.gm;
	renderCharacterList(data.characters);
	show('dashboard');
	$('char-detail').hidden = true;
	if (data.characters.length) {
		const last = Number(localStorageGet('lastCharacter'));
		await openCharacter(data.characters.some((c) => c.id === last) ? last : data.characters[0].id);
	}
};

$('signin-form').addEventListener('submit', async (e) => {
	e.preventDefault();
	const form = e.currentTarget;
	const error = $('signin-error');
	const button = form.querySelector('button');
	error.hidden = true;
	button.disabled = true;
	try {
		await api('login', { method: 'POST', body: JSON.stringify({ login: form.login.value.trim(), password: form.password.value }) });
		form.password.value = '';
		await loadDashboard();
	} catch (err) {
		error.textContent = err.message;
		error.hidden = false;
	} finally {
		button.disabled = false;
	}
});

$('signout').addEventListener('click', async () => {
	await api('logout', { method: 'POST' }).catch(() => {});
	current = null;
	showSignIn();
});

document.querySelectorAll('.items-tab').forEach((tab) => tab.addEventListener('click', () => {
	itemsTab = tab.dataset.items;
	document.querySelectorAll('.items-tab').forEach((t) => {
		t.classList.toggle('is-active', t === tab);
		t.setAttribute('aria-selected', String(t === tab));
	});
	renderItems();
}));
$('items-search').addEventListener('input', renderItems);

loadDashboard();
