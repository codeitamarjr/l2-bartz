// Builds site/resources/data/itemdb.ndjson.gz, the item database the website imports (php artisan itemdb:import),
// from the L2J datapack sources in src/. One JSON record per line:
//   {"t":"item",   id, name, type, kind, category, grade, icon, weight, price, crystals, ss, sps, mp, flags, stats}
//   {"t":"npc",    id, name, title, level, type}                       only NPCs that drop, spoil or sell something
//   {"t":"drop",   g, npc, item, kind: "drop"|"spoil", min, max, chance, gchance}
//                  g groups the items of one drop group; an item outside a group is a group of its own (gchance 100)
//   {"t":"shop",   npc, item}                                           merchant scripts in ai/npc (BuySellList)
//   {"t":"recipe", id, recipe, name, level, dwarven, success, mp, product, count, rare, ingredients}
// The server's rates are applied by the website, from the live config. Re-run after updating the datapack
// (from site/):  node resources/data/build-itemdb.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dp = path.join(root, 'src/l2j-server-datapack/src/main/resources/data');
const ai = path.join(root, 'src/l2j-server-datapack/src/main/java/com/l2jserver/datapack/ai/npc');
const out = path.join(root, 'site/resources/data/itemdb.ndjson.gz');

const decode = (s) => s
	.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const xmlFiles = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.xml')).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8'));
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const records = [];

// Items
const JEWELRY = new Set(['neck', 'rear;lear', 'rfinger;lfinger']);
const ACCESSORY = new Set(['hair', 'hair2', 'hairall', 'deco1', 'lbracelet', 'rbracelet', 'waist', 'back', 'underwear', 'alldress']);
const STATS = new Set(['pAtk', 'mAtk', 'pAtkSpd', 'critRate', 'accCombat', 'pDef', 'mDef', 'maxMp', 'sDef', 'rEvas', 'rShld', 'pAtkRange',
	'fireRes', 'waterRes', 'windRes', 'earthRes', 'holyRes', 'darkRes', 'holyPower', 'magicSuccRes']);
const items = new Map();

for (const xml of xmlFiles(path.join(dp, 'stats/items'))) {
	for (const m of xml.matchAll(/<item\s+id="(\d+)"\s+type="(\w+)"\s+name="([^"]*)"[^>]*>([\s\S]*?)<\/item>/g)) {
		const [, id, type, name, body] = m;
		const set = (key) => body.match(new RegExp(`<set name="${key}" val="([^"]*)"`))?.[1];
		const num = (key) => (set(key) === undefined ? null : Number(set(key)));
		const flag = (key, fallback) => (set(key) === undefined ? fallback : set(key) === 'true' || set(key) === '1');
		const bodypart = set('bodypart');

		let kind = 'other';
		let category = 'etc';
		if (type === 'Weapon') {
			kind = (set('weapon_type') ?? 'ETC').toLowerCase();
			category = 'weapon';
		} else if (type === 'Armor') {
			kind = bodypart ?? 'other';
			category = JEWELRY.has(kind) ? 'jewelry' : ACCESSORY.has(kind) ? 'accessory' : 'armor';
			if (kind === 'lhand') kind = set('armor_type') === 'SIGIL' ? 'sigil' : 'shield';
		} else {
			kind = (set('etcitem_type') ?? 'other').toLowerCase();
			if (Number(id) === 57) kind = 'adena';
		}

		// Base stats: <set>/<add>/<mul> directly in <for>, not the per-enchant lines.
		const stats = {};
		const forBody = body.match(/<for>([\s\S]*?)<\/for>/)?.[1] ?? '';
		for (const s of forBody.matchAll(/<(set|add|mul)\s+stat="(\w+)"\s+val="(-?[\d.]+)"\s*\/>/g)) {
			if (STATS.has(s[2])) stats[s[2]] = { op: s[1], val: Number(s[3]) };
		}

		const grade = set('crystal_type');
		const item = {
			t: 'item', id: Number(id), name: decode(name), type, kind, category,
			grade: grade && grade !== 'NONE' ? grade : null,
			icon: set('icon') ?? null,
			weight: num('weight') ?? 0,
			price: num('price') ?? 0,
			crystals: num('crystal_count'),
			ss: num('soulshots'), sps: num('spiritshots'), mp: num('mp_consume'),
			flags: {
				stackable: flag('is_stackable', false),
				tradable: flag('is_tradable', true),
				droppable: flag('is_droppable', true),
				sellable: flag('is_sellable', true),
				quest: flag('is_questitem', false),
				magic: flag('is_magic_weapon', false),
				herb: flag('ex_immediate_effect', false), // herbs use the herb drop rate
				limited: num('time') ?? num('duration'),
			},
			stats,
		};
		items.set(item.id, item);
		records.push(item);
	}
}

// NPCs and their drops / spoils
const npcs = new Map();
const used = new Set();
let group = 0;

for (const xml of xmlFiles(path.join(dp, 'stats/npcs'))) {
	for (const m of xml.matchAll(/<npc\s+([^>]*)>([\s\S]*?)<\/npc>/g)) {
		const [, head, body] = m;
		const npc = {
			t: 'npc', id: Number(attr(head, 'id')), name: decode(attr(head, 'name') ?? ''), title: attr(head, 'title') ? decode(attr(head, 'title')) : null,
			level: Number(attr(head, 'level') ?? 0), type: (attr(head, 'type') ?? 'L2Npc').replace(/^L2/, ''),
		};
		npcs.set(npc.id, npc);

		for (const [tag, kind] of [['death', 'drop'], ['corpse', 'spoil']]) {
			const list = body.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1];
			if (!list) continue;
			const push = (itemTag, g, gchance) => {
				const itemId = Number(attr(itemTag, 'id'));
				if (!items.has(itemId)) return;
				records.push({ t: 'drop', g, npc: npc.id, item: itemId, kind, min: Number(attr(itemTag, 'min')), max: Number(attr(itemTag, 'max')), chance: Number(attr(itemTag, 'chance')), gchance });
				used.add(npc.id);
			};
			for (const gm of list.matchAll(/<group\s+chance="([\d.]+)"\s*>([\s\S]*?)<\/group>/g)) {
				group++;
				for (const im of gm[2].matchAll(/<item\s[^>]*\/>/g)) push(im[0], group, Number(gm[1]));
			}
			for (const im of list.replace(/<group[\s\S]*?<\/group>/g, '').matchAll(/<item\s[^>]*\/>/g)) push(im[0], ++group, 100);
		}
	}
}

// Merchants: ai/npc/**/*.java scripts with "npcId = N" and BuySellList(itemId, ...)
const javaFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? javaFiles(path.join(dir, e.name)) : e.name.endsWith('.java') ? [path.join(dir, e.name)] : []));
let shops = 0;
for (const file of javaFiles(ai)) {
	const src = fs.readFileSync(file, 'utf8');
	const npcId = Number(src.match(/int npcId = (\d+);/)?.[1]);
	if (!npcId || !src.includes('new BuySellList(')) continue;
	const seen = new Set();
	for (const m of src.matchAll(/new BuySellList\((\d+),/g)) {
		const itemId = Number(m[1]);
		if (seen.has(itemId) || !items.has(itemId)) continue;
		seen.add(itemId);
		records.push({ t: 'shop', npc: npcId, item: itemId });
		shops++;
	}
	used.add(npcId);
}

for (const id of used) {
	if (npcs.has(id)) records.push(npcs.get(id));
}

// Recipes
const recipeXml = fs.readFileSync(path.join(dp, 'recipes.xml'), 'utf8');
let recipes = 0;
for (const m of recipeXml.matchAll(/<item\s+([^>]*recipeId="\d+"[^>]*)>([\s\S]*?)<\/item>/g)) {
	const [, head, body] = m;
	const production = body.match(/<production\s[^>]*\/>/)?.[0];
	const rare = body.match(/<productionRare\s[^>]*\/>/)?.[0];
	records.push({
		t: 'recipe', id: Number(attr(head, 'id')), recipe: Number(attr(head, 'recipeId')), name: attr(head, 'name'),
		level: Number(attr(head, 'craftLevel')), dwarven: attr(head, 'type') === 'dwarven', success: Number(attr(head, 'successRate')),
		mp: Number(body.match(/<statUse name="MP" value="(\d+)"/)?.[1] ?? 0),
		product: Number(attr(production, 'id')), count: Number(attr(production, 'count')),
		rare: rare ? { id: Number(attr(rare, 'id')), count: Number(attr(rare, 'count')), rarity: Number(attr(rare, 'rarity')) } : null,
		ingredients: [...body.matchAll(/<ingredient\s+id="(\d+)"\s+count="(\d+)"/g)].map((i) => [Number(i[1]), Number(i[2])]),
	});
	recipes++;
}

fs.writeFileSync(out, zlib.gzipSync(records.map((r) => JSON.stringify(r)).join('\n') + '\n', { level: 9 }));
const count = (t) => records.filter((r) => r.t === t).length;
console.log(`Wrote ${path.relative(root, out)}: ${count('item')} items, ${count('npc')} npcs, ${count('drop')} drops, ${shops} shop entries, ${recipes} recipes (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
