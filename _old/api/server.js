// Read-only API for the website.
//   GET /api/status  -> server status, players online, rates, world stats, top players, castles (About page)
//   GET /api/events  -> what's happening now: bosses, sieges, Olympiad, Seven Signs (events.js)
//   /api/login, /api/logout, /api/me, /api/characters/:id -> player area (account.js)
// Uses a database user that can only SELECT. Stats are cached for CACHE_SECONDS.
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { createAccountRoutes } from './account.js';
import { loadEvents } from './events.js';

const env = (name, fallback) => process.env[name] ?? fallback;

const PORT = Number(env('PORT', 3000));
const CACHE_SECONDS = Number(env('CACHE_SECONDS', 15));
const LOGIN_HOST = env('LOGIN_HOST', 'login');
const GAME_HOST = env('GAME_HOST', 'game');
const PUBLIC_HOST = env('PUBLIC_HOST', '');
const RATES_FILE = env('RATES_FILE', '/config/rates.properties');
const GEODATA_DIR = env('GEODATA_DIR', '/geodata');

const pool = mysql.createPool({
	host: env('DB_HOST', 'db'),
	port: Number(env('DB_PORT', 3306)),
	user: env('DB_USER', 'web'),
	password: env('DB_PASSWORD', ''),
	connectionLimit: 3,
	connectTimeout: 3000,
});

const RACES = ['Human', 'Elf', 'Dark Elf', 'Orc', 'Dwarf', 'Kamael'];

// Resolves true if something accepts a TCP connection on host:port within the timeout.
const isListening = (host, port, timeoutMs = 1500) => new Promise((resolve) => {
	const socket = net.connect({ host, port });
	const done = (ok) => { socket.destroy(); resolve(ok); };
	socket.setTimeout(timeoutMs, () => done(false));
	socket.once('connect', () => done(true));
	socket.once('error', () => done(false));
});

// Rates come from the same override file the game server merges; keys not listed there are L2J's retail x1.
const readRates = async () => {
	let text = '';
	try {
		text = await fs.readFile(RATES_FILE, 'utf8');
	} catch {
		// No override file: the server runs the retail defaults.
	}
	const props = {};
	for (const line of text.split('\n')) {
		const m = line.match(/^\s*([A-Za-z0-9_.]+)\s*=\s*(.*?)\s*$/);
		if (m) props[m[1]] = m[2];
	}
	const num = (key) => Number(props[key] ?? 1);
	const byItem = (key, itemId) => {
		const entry = (props[key] ?? '').split(';').map((p) => p.split(',')).find(([id]) => Number(id) === itemId);
		return entry ? Number(entry[1]) : 1;
	};
	return {
		xp: num('RateXp'),
		sp: num('RateSp'),
		adena: byItem('DropAmountMultiplierByItemId', 57),
		drop: num('DeathDropChanceMultiplier'),
		spoil: num('CorpseDropChanceMultiplier'),
		raid: num('RaidDropChanceMultiplier'),
		questXp: num('RateQuestRewardXP'),
		questAdena: num('RateQuestRewardAdena'),
	};
};

const countGeodataRegions = async () => {
	try {
		return (await fs.readdir(GEODATA_DIR)).filter((f) => f.endsWith('.l2j')).length;
	} catch {
		return 0;
	}
};

// GMs (accesslevel > 0) are left out of rankings so staff characters don't top the lists.
const readWorld = async () => {
	const q = async (sql) => (await pool.query(sql))[0];
	const [totals] = await q(`
		SELECT
			(SELECT COUNT(login) FROM l2jls.accounts) AS accounts,
			(SELECT COUNT(*) FROM l2jgs.characters) AS characters,
			(SELECT COUNT(*) FROM l2jgs.characters WHERE online = 1) AS online,
			(SELECT COUNT(*) FROM l2jgs.clan_data) AS clans`);
	const races = await q('SELECT race, COUNT(*) AS n FROM l2jgs.characters GROUP BY race');
	const topLevel = await q(`
		SELECT char_name AS name, level, race FROM l2jgs.characters
		WHERE accesslevel = 0 ORDER BY level DESC, exp DESC LIMIT 5`);
	const topPvp = await q(`
		SELECT char_name AS name, pvpkills AS pvp, level, race FROM l2jgs.characters
		WHERE accesslevel = 0 AND pvpkills > 0 ORDER BY pvpkills DESC LIMIT 5`);
	const castles = await q(`
		SELECT c.name AS castle, cd.clan_name AS clan FROM l2jgs.castle c
		LEFT JOIN l2jgs.clan_data cd ON cd.hasCastle = c.id ORDER BY c.id`);
	const raceName = (r) => RACES[r] ?? 'Unknown';
	return {
		players: { online: Number(totals.online) },
		totals: { accounts: Number(totals.accounts), characters: Number(totals.characters), clans: Number(totals.clans) },
		races: RACES.map((name, i) => ({ name, count: Number(races.find((r) => r.race === i)?.n ?? 0) })),
		top: {
			level: topLevel.map((c) => ({ name: c.name, level: c.level, race: raceName(c.race) })),
			pvp: topPvp.map((c) => ({ name: c.name, pvp: c.pvp, level: c.level, race: raceName(c.race) })),
		},
		castles: castles.map((c) => ({ name: c.castle, owner: c.clan ?? null })),
	};
};

const buildStatus = async () => {
	const [login, game, rates, geodataRegions] = await Promise.all([
		isListening(LOGIN_HOST, 2106),
		isListening(GAME_HOST, 7777),
		readRates(),
		countGeodataRegions(),
	]);
	let world = null;
	let database = true;
	try {
		world = await readWorld();
	} catch (err) {
		database = false;
		console.error('Database query failed:', err.message);
	}
	return {
		generatedAt: new Date().toISOString(),
		server: { name: 'Bartz', chronicle: 'High Five', maxLevel: 85, address: PUBLIC_HOST || null, geodataRegions },
		status: { login, game, database },
		rates,
		...world,
	};
};

let cache = { at: 0, body: null, pending: null };
const getStatus = async () => {
	if (cache.body && Date.now() - cache.at < CACHE_SECONDS * 1000) return cache.body;
	// Concurrent requests during a refresh share one database round-trip.
	cache.pending ??= buildStatus().then((data) => {
		cache = { at: Date.now(), body: JSON.stringify(data), pending: null };
		return cache.body;
	}).finally(() => { cache.pending = null; });
	return cache.pending;
};

let eventsCache = { at: 0, body: null, pending: null };
const getEvents = async () => {
	if (eventsCache.body && Date.now() - eventsCache.at < CACHE_SECONDS * 1000) return eventsCache.body;
	eventsCache.pending ??= loadEvents(pool).then((data) => {
		eventsCache = { at: Date.now(), body: JSON.stringify(data), pending: null };
		return eventsCache.body;
	}).finally(() => { eventsCache.pending = null; });
	return eventsCache.pending;
};

const accountRoutes = createAccountRoutes(pool);

const server = http.createServer(async (req, res) => {
	try {
		if (await accountRoutes(req, res)) return;
	} catch (err) {
		console.error(err);
		if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":"Something went wrong. Try again."}');
		return;
	}
	if (req.method !== 'GET') {
		res.writeHead(405).end();
		return;
	}
	if (req.url === '/api/status') {
		try {
			const body = await getStatus();
			res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` }).end(body);
		} catch (err) {
			console.error(err);
			res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":"unavailable"}');
		}
		return;
	}
	if (req.url === '/api/events') {
		try {
			const body = await getEvents();
			res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` }).end(body);
		} catch (err) {
			console.error(err);
			res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":"unavailable"}');
		}
		return;
	}
	if (req.url === '/api/health') {
		res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
		return;
	}
	res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"not found"}');
});

server.listen(PORT, () => console.log(`Stats API listening on :${PORT}`));

const shutdown = () => server.close(() => pool.end().finally(() => process.exit(0)));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
