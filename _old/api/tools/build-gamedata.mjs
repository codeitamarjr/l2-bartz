// Builds api/data/gamedata.json from the L2J datapack sources in src/:
//   items:   id -> [name, type, grade]   (data/stats/items/*.xml)
//   classes: id -> name                  (data/stats/chars/classList.xml)
//   exp:     level -> total XP needed    (data/stats/expData.json)
//   bosses:  npc id -> [name, level]     raid and grand bosses (data/stats/npcs/*.xml)
// Re-run after updating the datapack:  node api/tools/build-gamedata.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dp = path.join(root, 'src/l2j-server-datapack/src/main/resources/data');
const out = path.join(root, 'api/data/gamedata.json');

const decode = (s) => s
	.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const items = {};
const itemDir = path.join(dp, 'stats/items');
for (const file of fs.readdirSync(itemDir).filter((f) => f.endsWith('.xml')).sort()) {
	const xml = fs.readFileSync(path.join(itemDir, file), 'utf8');
	for (const m of xml.matchAll(/<item\s+id="(\d+)"\s+type="(\w+)"\s+name="([^"]*)"[^>]*>([\s\S]*?)<\/item>/g)) {
		const [, id, type, name, body] = m;
		const grade = body.match(/<set name="crystal_type" val="(\w+)"/)?.[1] ?? 'NONE';
		items[id] = grade === 'NONE' ? [decode(name), type] : [decode(name), type, grade];
	}
}

const classes = {};
const classXml = fs.readFileSync(path.join(dp, 'stats/chars/classList.xml'), 'utf8');
for (const m of classXml.matchAll(/<class classId="(\d+)" name="([^"]*)"/g)) classes[m[1]] = decode(m[2]);

const exp = JSON.parse(fs.readFileSync(path.join(dp, 'stats/expData.json'), 'utf8'));

const bosses = {};
const npcDir = path.join(dp, 'stats/npcs');
for (const file of fs.readdirSync(npcDir).filter((f) => f.endsWith('.xml')).sort()) {
	const xml = fs.readFileSync(path.join(npcDir, file), 'utf8');
	for (const m of xml.matchAll(/<npc\s+id="(\d+)"\s+level="(\d+)"\s+type="L2(?:RaidBoss|GrandBoss)"\s+name="([^"]*)"/g)) {
		bosses[m[1]] = [decode(m[3]), Number(m[2])];
	}
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ items, classes, exp, bosses }));
console.log(`Wrote ${path.relative(root, out)}: ${Object.keys(items).length} items, ${Object.keys(classes).length} classes, ${Object.keys(exp).length} levels, ${Object.keys(bosses).length} bosses (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
