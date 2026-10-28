// Player area: sign in with the game account, then read your own characters, their status and items.
//   POST /api/login              {"login","password"} -> session cookie
//   POST /api/logout
//   GET  /api/me                 account + character list
//   GET  /api/characters/:id     status and items of one of your characters
// Read-only: nothing here writes to the game. Passwords are checked the way L2J stores them
// (base64(sha1(password))) and the stored hash never leaves this process.
import crypto from 'node:crypto';
import fs from 'node:fs';

const SESSION_COOKIE = 'bz_session';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // sliding: each request extends it
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IP = 10;
const MAX_FAILS_PER_ACCOUNT = 5;
const MAX_BODY_BYTES = 2048;

// Item names/types/grades, class names and the XP table, generated from the datapack by tools/build-gamedata.mjs.
const gamedata = JSON.parse(fs.readFileSync(new URL('./data/gamedata.json', import.meta.url), 'utf8'));

const RACES = ['Human', 'Elf', 'Dark Elf', 'Orc', 'Dwarf', 'Kamael'];
const SLOTS = [
	'Underwear', 'Head', 'Hair', 'Hair 2', 'Necklace', 'Weapon', 'Chest', 'Shield', 'Right Earring', 'Left Earring',
	'Gloves', 'Legs', 'Feet', 'Right Ring', 'Left Ring', 'Left Bracelet', 'Right Bracelet',
	'Talisman 1', 'Talisman 2', 'Talisman 3', 'Talisman 4', 'Talisman 5', 'Talisman 6', 'Cloak', 'Belt',
];
const LOGIN_PATTERN = /^[A-Za-z0-9_-]{1,45}$/;

const sessions = new Map(); // token -> { login, expires }
const failures = new Map(); // "ip:<ip>" | "acct:<login>" -> [timestamps]

const l2jHash = (password) => crypto.createHash('sha1').update(password, 'utf8').digest('base64');

const json = (res, status, body, headers = {}) => {
	res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers });
	res.end(JSON.stringify(body));
};

// nginx sets X-Real-IP from the real connection; the API is only reachable through nginx (no published port).
const clientIp = (req) => req.headers['x-real-ip'] || req.socket.remoteAddress;

const recentFailures = (key) => {
	const now = Date.now();
	const list = (failures.get(key) ?? []).filter((t) => now - t < FAIL_WINDOW_MS);
	failures.set(key, list);
	return list.length;
};
const addFailure = (key) => failures.set(key, [...(failures.get(key) ?? []), Date.now()]);

const readBody = (req) => new Promise((resolve, reject) => {
	let size = 0;
	const chunks = [];
	req.on('data', (c) => {
		size += c.length;
		// Keep reading (and discarding) so the client still gets a proper error response.
		if (size <= MAX_BODY_BYTES) chunks.push(c);
	});
	req.on('end', () => (size > MAX_BODY_BYTES ? reject(new Error('too large')) : resolve(Buffer.concat(chunks).toString('utf8'))));
	req.on('error', reject);
});

const parseCookies = (req) => Object.fromEntries((req.headers.cookie ?? '').split(';')
	.map((c) => c.trim().split('='))
	.filter(([k, v]) => k && v)
	.map(([k, v]) => [k, decodeURIComponent(v)]));

const sessionCookie = (req, token, maxAgeSeconds) => {
	const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
	return `${SESSION_COOKIE}=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
};

const currentSession = (req) => {
	const token = parseCookies(req)[SESSION_COOKIE];
	const session = token && sessions.get(token);
	if (!session) return null;
	if (session.expires < Date.now()) {
		sessions.delete(token);
		return null;
	}
	session.expires = Date.now() + SESSION_TTL_MS;
	return { token, ...session };
};

// Requests that change state must come from this site (SameSite=Strict already blocks most cross-site use).
const sameOrigin = (req) => {
	const origin = req.headers.origin;
	if (!origin) return true;
	try {
		return new URL(origin).host === req.headers.host;
	} catch {
		return false;
	}
};

const expProgress = (level, exp) => {
	const current = gamedata.exp[level] ?? 0;
	const next = gamedata.exp[level + 1];
	if (!next) return 100;
	return Math.max(0, Math.min(100, ((exp - current) / (next - current)) * 100));
};

const describeItem = (row) => {
	const [name, type, grade] = gamedata.items[row.item_id] ?? [`Unknown item ${row.item_id}`, 'EtcItem'];
	return {
		id: row.object_id,
		itemId: row.item_id,
		name,
		type,
		grade: grade ?? null,
		count: Number(row.count),
		enchant: row.enchant_level || 0,
	};
};

const byTypeThenName = (a, b) => {
	if (a.itemId === 57) return -1; // Adena first
	if (b.itemId === 57) return 1;
	const order = { Weapon: 0, Armor: 1, EtcItem: 2 };
	return (order[a.type] - order[b.type]) || a.name.localeCompare(b.name);
};

const query = (pool) => async (sql, params) => (await pool.query(sql, params))[0];

const characterSummary = (c) => ({
	id: c.charId,
	name: c.char_name,
	title: c.title || null,
	level: c.level,
	className: gamedata.classes[c.classid] ?? `Class ${c.classid}`,
	baseClassName: c.base_class !== c.classid ? (gamedata.classes[c.base_class] ?? null) : null,
	race: RACES[c.race] ?? 'Unknown',
	sex: c.sex === 1 ? 'Female' : 'Male',
	online: c.online === 1,
	clan: c.clan_name ?? null,
	noblesse: c.nobless === 1,
	gm: c.accesslevel > 0,
	lastSeen: c.lastAccess ? new Date(Number(c.lastAccess)).toISOString() : null,
	deleting: Number(c.deletetime) > 0,
});

const CHARACTER_COLUMNS = `c.charId, c.char_name, c.title, c.level, c.classid, c.base_class, c.race, c.sex, c.online,
	c.nobless, c.accesslevel, c.lastAccess, c.deletetime, cd.clan_name`;

export const loadAccount = async (pool, login) => {
	const q = query(pool);
	const [account] = await q('SELECT login, accessLevel, created_time FROM l2jls.accounts WHERE login = ?', [login]);
	if (!account) return null;
	const characters = await q(`SELECT ${CHARACTER_COLUMNS} FROM l2jgs.characters c
		LEFT JOIN l2jgs.clan_data cd ON cd.clan_id = c.clanid
		WHERE c.account_name = ? ORDER BY c.char_slot, c.charId`, [login]);
	return {
		account: { login: account.login, gm: account.accessLevel > 0, created: account.created_time },
		characters: characters.map(characterSummary),
	};
};

export const loadCharacter = async (pool, login, id) => {
	const q = query(pool);
	// The account_name check makes sure you can only open your own characters.
	const [c] = await q(`SELECT ${CHARACTER_COLUMNS}, c.exp, c.sp, c.curHp, c.maxHp, c.curMp, c.maxMp, c.curCp, c.maxCp,
			c.karma, c.fame, c.pvpkills, c.pkkills, c.onlinetime, c.createDate, c.vitality_points, cd.clan_level
		FROM l2jgs.characters c LEFT JOIN l2jgs.clan_data cd ON cd.clan_id = c.clanid
		WHERE c.charId = ? AND c.account_name = ?`, [id, login]);
	if (!c) return null;

	const rows = await q(`SELECT object_id, item_id, count, enchant_level, loc, loc_data FROM l2jgs.items
		WHERE owner_id = ? AND loc IN ('PAPERDOLL', 'INVENTORY', 'WAREHOUSE')`, [id]);
	const equipped = rows.filter((r) => r.loc === 'PAPERDOLL')
		.sort((a, b) => a.loc_data - b.loc_data)
		.map((r) => ({ slot: SLOTS[r.loc_data] ?? `Slot ${r.loc_data}`, ...describeItem(r) }));
	const inventory = rows.filter((r) => r.loc === 'INVENTORY').map(describeItem).sort(byTypeThenName);
	const warehouse = rows.filter((r) => r.loc === 'WAREHOUSE').map(describeItem).sort(byTypeThenName);

	const exp = Number(c.exp);
	return {
		...characterSummary(c),
		clanLevel: c.clan_level ?? null,
		status: {
			hp: { current: Math.round(c.curHp), max: c.maxHp },
			mp: { current: Math.round(c.curMp), max: c.maxMp },
			cp: { current: Math.round(c.curCp), max: c.maxCp },
			exp,
			expPercent: Math.round(expProgress(c.level, exp) * 100) / 100,
			sp: Number(c.sp),
			karma: c.karma,
			fame: c.fame,
			pvp: c.pvpkills,
			pk: c.pkkills,
			vitality: c.vitality_points,
			onlineSeconds: Number(c.onlinetime),
			created: c.createDate,
		},
		adena: Number(inventory.find((i) => i.itemId === 57)?.count ?? 0),
		items: { equipped, inventory, warehouse },
	};
};

// Returns a handler that answers the player-area routes and resolves true, or resolves false for other URLs.
export const createAccountRoutes = (pool) => {
	const q = query(pool);

	const login = async (req, res) => {
		if (!sameOrigin(req)) return json(res, 403, { error: 'Forbidden.' });
		const ip = clientIp(req);
		if (recentFailures(`ip:${ip}`) >= MAX_FAILS_PER_IP) {
			return json(res, 429, { error: 'Too many failed sign-ins. Try again in 15 minutes.' });
		}
		let body;
		try {
			body = JSON.parse(await readBody(req));
		} catch {
			return json(res, 400, { error: 'Invalid request.' });
		}
		const name = typeof body.login === 'string' ? body.login.trim() : '';
		const password = typeof body.password === 'string' ? body.password : '';
		if (!LOGIN_PATTERN.test(name) || !password || password.length > 64) {
			return json(res, 400, { error: 'Enter your game account name and password.' });
		}
		const accountKey = `acct:${name.toLowerCase()}`;
		if (recentFailures(accountKey) >= MAX_FAILS_PER_ACCOUNT) {
			return json(res, 429, { error: 'Too many failed sign-ins for this account. Try again in 15 minutes.' });
		}

		const [account] = await q('SELECT login, password, accessLevel FROM l2jls.accounts WHERE login = ?', [name]);
		// Hash even when the account doesn't exist, so response time doesn't reveal which names exist.
		const given = Buffer.from(l2jHash(password));
		const stored = Buffer.from(account?.password ?? l2jHash(crypto.randomBytes(16).toString('hex')));
		const ok = account && given.length === stored.length && crypto.timingSafeEqual(given, stored);
		if (!ok) {
			addFailure(`ip:${ip}`);
			addFailure(accountKey);
			return json(res, 401, { error: 'Wrong account name or password.' });
		}
		if (account.accessLevel < 0) return json(res, 403, { error: 'This account is banned.' });

		const token = crypto.randomBytes(32).toString('base64url');
		sessions.set(token, { login: account.login, expires: Date.now() + SESSION_TTL_MS });
		failures.delete(accountKey);
		return json(res, 200, { login: account.login }, { 'Set-Cookie': sessionCookie(req, token, SESSION_TTL_MS / 1000) });
	};

	const logout = (req, res) => {
		if (!sameOrigin(req)) return json(res, 403, { error: 'Forbidden.' });
		const session = currentSession(req);
		if (session) sessions.delete(session.token);
		return json(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
	};

	const me = async (req, res, session) => {
		const data = await loadAccount(pool, session.login);
		return data ? json(res, 200, data) : json(res, 401, { error: 'Not signed in.' });
	};

	const character = async (req, res, session, id) => {
		const data = await loadCharacter(pool, session.login, id);
		return data ? json(res, 200, data) : json(res, 404, { error: 'Character not found.' });
	};

	const route = async (req, res, url) => {
		if (req.method === 'POST' && url === '/api/login') return login(req, res);
		if (req.method === 'POST' && url === '/api/logout') return logout(req, res);
		if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
		const session = currentSession(req);
		if (!session) return json(res, 401, { error: 'Not signed in.' });
		if (url === '/api/me') return me(req, res, session);
		const id = Number(url.slice('/api/characters/'.length));
		if (!Number.isInteger(id) || id <= 0) return json(res, 400, { error: 'Invalid character.' });
		return character(req, res, session, id);
	};

	return async (req, res) => {
		const url = req.url.split('?')[0];
		const ours = url === '/api/login' || url === '/api/logout' || url === '/api/me' || url.startsWith('/api/characters/');
		if (!ours) return false;
		await route(req, res, url);
		return true;
	};
};

// Drop expired sessions and old failure records every 10 minutes.
setInterval(() => {
	const now = Date.now();
	for (const [token, s] of sessions) if (s.expires < now) sessions.delete(token);
	for (const key of failures.keys()) recentFailures(key);
}, 10 * 60 * 1000).unref();
