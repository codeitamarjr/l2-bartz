import { EVENT_LORE_PT } from '@/data/event-lore-pt';
import type { Locale } from '@/i18n';
import type { GameEvent } from '@/types';

/**
 * "Learn more" texts for the Happening Now cards: the story behind each event (consistent with /lore, High Five
 * only) and how it works on this server. Rules come from the server's own config and source (siege.properties,
 * olympiad.properties, SevenSigns.java, the boss AI scripts); keep them in sync if those change. The Portuguese texts
 * are in event-lore-pt.ts.
 */
export type EventLore = {
    lore: string[];
    howItWorks: string[];
    chapter?: { href: string; label: string };
};

/** Every "Learn more" text in one language. */
export type EventLoreSet = {
    sevensigns: EventLore;
    olympiad: EventLore;
    siege: EventLore;
    raid: EventLore;
    tvt: EventLore;
    epic: Record<string, EventLore>;
};

const SEVEN_SIGNS: EventLore = {
    lore: [
        "Since the days of Emperor Shunaiman, the Lords of Dawn, faithful to Einhasad and the Empire, have warred with the Revolutionaries of Dusk, heirs of Lilith and the Children of Shilen. Their battlefield is the Necropolis and the Catacombs, raised long ago by Shilen's followers.",
        'Three ancient seals decide which side shapes Aden: the Seal of Avarice, the Seal of Gnosis and the Seal of Strife. Whoever wins the war holds their power for the week that follows.',
    ],
    howItWorks: [
        'A cycle takes two weeks and turns every Monday at 18:00 (server time): a short Recruitment, a week of Competition, short Results, then a week of Seal Validation.',
        'During Competition, join Dawn or Dusk at a Priest of Dawn or Priest of Dusk in any town, then earn points for your side by collecting Seal Stones in the Catacombs and Necropolises and by fighting in the Festival of Darkness.',
        'The winning side controls the seals during Seal Validation: Avarice opens the Merchant and Blacksmith of Mammon, Gnosis brings priests who bless the winners and curse the losers, and Strife decides whether castle gates are reinforced or weakened in sieges.',
    ],
    chapter: { href: '/lore#empire', label: 'Chapter V: The Empire of Elmoreden' },
};

const OLYMPIAD: EventLore = {
    lore: [
        'When the bravest adventurers learned the secrets of the Giants and rose as Noblesse, Aden needed a way to crown the best among them. The Grand Olympiad was born: one arena, one opponent, and only skill decides.',
        'Each season ends with a new Hero for every class, whose name is remembered across the land.',
    ],
    howItWorks: [
        'Only Noblesse can compete. Register with an Olympiad Manager while the arena is open: every day from 18:00 for 6 hours (server time).',
        'Fight in class-based or all-class matches to win points; at least 15 matches in a season are needed to be considered for Hero.',
        'At the end of each season the top Noblesse of every class becomes Hero, with Hero weapons, Hero skills and a glowing aura.',
    ],
    chapter: { href: '/lore#chaos', label: 'Chapter VII: The Chaotic Era' },
};

const SIEGE: EventLore = {
    lore: [
        'Since the Battle for Giran Castle, the old rules of siege are law: whoever takes a castle becomes its rightful lord, whatever their birth. The kings of Aden can only confirm the outcome.',
        'Nine castles stand across the land. Each one brings taxes, a castle hall and the respect, or the envy, of every clan in Aden.',
    ],
    howItWorks: [
        'Clans of level 5 or higher register as attackers or defenders with the castle messenger before the siege.',
        'A siege lasts 2 hours. Attackers must break through the walls and gates, and their clan leader must engrave the clan seal on the castle’s Holy Artifact.',
        'The clan that holds the castle when time runs out rules it until the next siege.',
    ],
    chapter: { href: '/lore#chaos', label: 'Chapter VII: The Chaotic Era' },
};

const RAID: EventLore = {
    lore: [
        'Fallen champions, ancient beasts and the generals of forgotten wars roam the wild lands of Aden. They are stronger than any single adventurer, and they guard treasures to match.',
    ],
    howItWorks: [
        'Raid bosses stand at fixed places around the world, from level 20 to the end game. Gather a party, find one of your level and bring it down.',
        'They drop rare materials, recipes and equipment, and give Raid Points.',
        'A slain raid boss returns a day or two later. The About page shows when the most recent ones are due.',
    ],
};

const TVT: EventLore = {
    lore: ['Not every battle is about thrones. In the Coliseum, adventurers prove themselves for the crowd.'],
    howItWorks: [
        'Register with the event manager while registration is open. When it closes, players are split into two teams and sent to the arena.',
        'Every kill scores for your team; the team with the most kills when time runs out wins the rewards.',
    ],
};

/** Epic bosses, by NPC id (same ids as grandboss_data). */
const EPIC: Record<string, EventLore> = {
    '29068': {
        lore: [
            'Antharas, the Earth Dragon, is a child of Shilen and Gran Kain. When Shilen was defeated he went to ground beneath Dragon Valley near Giran, where he sleeps and waits for her return.',
            'Every time the ground of the valley trembles, the people of Giran look to the mountains.',
        ],
        howItWorks: [
            'Gather an army at the entrance of his lair in Dragon Valley. Once the first heroes enter, the lair stays open for others to join for a short while, then seals.',
            'He is one of the strongest beings in Aden: only well-prepared alliances survive.',
            'If he falls, he returns days later. The card shows when.',
        ],
        chapter: { href: '/lore#shilen', label: "Chapter IV: Shilen's Betrayal" },
    },
    '29028': {
        lore: [
            'Valakas, the Fire Dragon, is a child of Shilen and Gran Kain. He sleeps in the flames of the Forge of the Gods, and the fires there burn hotter every season.',
        ],
        howItWorks: [
            'His Hall of Flames lies deep in the Forge of the Gods. When the first heroes enter, there is a 30-minute window for more to join before the hall seals.',
            'Once battle begins nobody else can enter. Bring fire resistance and a full alliance.',
            'If he is slain, he returns days later. The card shows when.',
        ],
        chapter: { href: '/lore#shilen', label: "Chapter IV: Shilen's Betrayal" },
    },
    '29020': {
        lore: [
            'Emperor Baium of Elmoreden built the Tower of Insolence to reach the gods themselves. The gods answered by sealing him at its summit, frozen in his own monument.',
            'His empire broke in two when he fell: the Kingdom of Aden and the Kingdom of Elmore.',
        ],
        howItWorks: [
            'Climb the Tower of Insolence to the top floor, where Baium sits frozen on his throne. Waking him starts the fight.',
            'He is joined by his Archangels. Bring a full raid group.',
            'Once defeated, he returns days later. The card shows when.',
        ],
        chapter: { href: '/lore#baium', label: 'Chapter VI: The Tower of Insolence' },
    },
    '29118': {
        lore: [
            'On the cursed island of Hellbound, demons ruled over enslaved natives until adventurers broke their hold. Beleth sits on his throne at the heart of the island.',
        ],
        howItWorks: [
            'His throne lies on Hellbound, reached only after the island has been opened up by its long questlines.',
            'A battle for the strongest alliances on the server.',
        ],
        chapter: { href: '/lore#gracia', label: 'Chapter VIII: Beyond the Sea' },
    },
    '29001': {
        lore: ['Beneath the fields of Dion lies a vast Ant Nest. At its heart Queen Ant breeds an endless brood, guarded by her nurses and royal guards.'],
        howItWorks: [
            "Fight through the Ant Nest to her chamber. Kill her nurses first, or they'll heal her.",
            'A classic target for mid-level clans. If she is slain, she returns a day or two later.',
        ],
    },
    '29006': {
        lore: ['Cruma Tower, a relic of an older age, still hums with ancient machinery. At its core waits Core, guarded by the constructs that serve it.'],
        howItWorks: ["Descend through Cruma Tower to its core chamber. A mid-level clan target; once destroyed, it returns a day or two later."],
    },
    '29014': {
        lore: ['Orfen, the Nightmare Kraken, haunts the Sea of Spores near Oren, a creature born of the poison that drifts over that land.'],
        howItWorks: ['Orfen wanders the Sea of Spores with her escorts. A mid-level clan target; if slain, she returns a day or two later.'],
    },
};

const EVENT_LORE_EN: EventLoreSet = { sevensigns: SEVEN_SIGNS, olympiad: OLYMPIAD, siege: SIEGE, raid: RAID, tvt: TVT, epic: EPIC };

export function eventLore(event: GameEvent, locale: Locale = 'en'): EventLore | null {
    const lore = locale === 'pt_BR' ? EVENT_LORE_PT : EVENT_LORE_EN;

    switch (event.category) {
        case 'epic':
            return lore.epic[event.id.replace('epic-', '')] ?? null;
        case 'sevensigns':
            return lore.sevensigns;
        case 'olympiad':
            return lore.olympiad;
        case 'siege':
            return lore.siege;
        case 'raid':
            return lore.raid;
        case 'tvt':
            return lore.tvt;
        default:
            return null;
    }
}
