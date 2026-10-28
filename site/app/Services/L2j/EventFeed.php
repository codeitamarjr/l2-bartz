<?php

namespace App\Services\L2j;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * "Happening now": live state of epic bosses, raid bosses, castle sieges, the Grand Olympiad, the Seven Signs and
 * Team vs Team, each with a lore-flavoured headline. Sorted live, soon (< 24 h), scheduled, ready, slain.
 * Daily times use the app time zone, which must match the game server's (both UTC unless TZ is set).
 * Each event lists where it happens on the world map ("at", see WorldMap).
 */
class EventFeed
{
    private const DAY_MS = 86_400_000;

    private const STATE_ORDER = ['live' => 0, 'soon' => 1, 'scheduled' => 2, 'ready' => 3, 'slain' => 4];

    /**
     * Epic bosses in prestige order (the landing page shows the first ones when several share a state).
     * grandboss_data.status meanings come from each boss's AI script in the datapack: four-state bosses use
     * 0 alive, 1 heroes entering, 2 fighting, 3 dead; the others 0 alive, 1 dead.
     *
     * "at" pins bosses whose spawn is not on the map (Valakas fights in a separate zone, Beleth on Hellbound);
     * the others are placed from their spawn in grandboss_data.
     *
     * @var array<int, array{place: string, fourState?: bool, at?: array{0: int, 1: int}, ready: string, gathering?: string, fighting?: string, slain: string}>
     */
    private const EPIC = [
        29068 => [
            'place' => "Antharas' Lair, Dragon Valley", 'fourState' => true,
            'ready' => "The Earth Dragon sleeps beneath Dragon Valley, waiting for Shilen's return. Who dares to wake him?",
            'gathering' => "Heroes have entered Antharas' Lair. The ground of Dragon Valley trembles as the Earth Dragon stirs.",
            'fighting' => 'Antharas has awoken! The battle for Dragon Valley rages right now.',
            'slain' => 'Antharas has fallen. The earth is quiet... for now.',
        ],
        29028 => [
            'place' => 'Hall of Flames, Forge of the Gods', 'fourState' => true, 'at' => [1895, 712],
            'ready' => 'Valakas slumbers in the Forge of the Gods. The fires burn hotter every day.',
            'gathering' => 'Valakas awakens! Heroes are gathering at the Hall of Flames. Entry closes soon.',
            'fighting' => 'The Fire Dragon is unleashed! The Hall of Flames burns as heroes fight for their lives.',
            'slain' => 'Valakas has been slain. The Forge of the Gods falls silent.',
        ],
        29020 => [
            'place' => 'Tower of Insolence', 'fourState' => true,
            'ready' => 'Emperor Baium sleeps sealed at the top of the Tower of Insolence. Only the bold will wake him.',
            'gathering' => 'Baium stirs! Someone has disturbed the emperor at the top of the Tower of Insolence.',
            'fighting' => 'Emperor Baium is awake and enraged. The Tower of Insolence shakes with battle!',
            'slain' => 'Baium has fallen once more. His throne at the top of the tower stands empty.',
        ],
        29118 => [
            'place' => "Beleth's Throne, Hellbound", 'fourState' => true, 'at' => [800, 2525],
            'ready' => 'Beleth waits on his throne in Hellbound. The cursed island whispers his name.',
            'gathering' => "The seal on Beleth's Throne weakens. Heroes gather on Hellbound.",
            'fighting' => 'Beleth has risen! Hellbound burns as the demon fights for his throne.',
            'slain' => 'Beleth has been cast down. Hellbound breathes again.',
        ],
        29001 => [
            'place' => 'Ant Nest, Dion',
            'ready' => 'Queen Ant rules her nest beneath Dion. Her brood grows every hour.',
            'slain' => 'Queen Ant has been slain. Her nest lies leaderless.',
        ],
        29006 => [
            'place' => 'Cruma Tower, Dion',
            'ready' => 'Core hums deep inside Cruma Tower, guarded by its ancient machines.',
            'slain' => 'Core has been destroyed. Cruma Tower is silent.',
        ],
        29014 => [
            'place' => 'Sea of Spores, Oren',
            'ready' => 'Orfen, the Nightmare Kraken, haunts the Sea of Spores.',
            'slain' => 'Orfen has been slain. The Sea of Spores is calm for a while.',
        ],
    ];

    private const SEVEN_SIGNS_PERIODS = ['Recruitment', 'Competition', 'Results', 'Seal Validation'];

    /** Castle icons on the map, in pixels, by castle.name. */
    private const CASTLES = [
        'Gludio' => [725, 1858], 'Dion' => [940, 2095], 'Giran' => [1395, 2025], 'Oren' => [1230, 1480], 'Aden' => [1563, 1340],
        'Innadril' => [1400, 2540], 'Goddard' => [1557, 1075], 'Rune' => [880, 1050], 'Schuttgart' => [1210, 545],
    ];

    /** The Seven Signs battlegrounds: every Necropolis and Catacomb drawn on the map, in pixels. */
    private const SEVEN_SIGNS_SITES = [
        'Necropolis of Sacrifice' => [612, 2352], "The Pilgrim's Necropolis" => [1052, 1940], 'Necropolis of Worship' => [1368, 2178],
        "The Patriot's Necropolis" => [692, 1693], 'Necropolis of Devotion' => [545, 1693], 'Necropolis of Martyrdom' => [1392, 1985],
        "The Saint's Necropolis" => [1222, 2350], "The Disciple's Necropolis" => [1553, 1180],
        'Catacomb of the Heretic' => [1095, 2050], 'Catacomb of the Branded' => [1040, 2160], 'Catacomb of the Apostate' => [1110, 1720],
        'Catacomb of the Witch' => [1510, 1700], 'Catacomb of Dark Omens' => [705, 1372], 'Catacomb of the Forbidden Path' => [1372, 1735],
    ];

    private const OLYMPIAD_STADIUM = [715, 1200];

    public function __construct(private GameConfig $config, private GameData $gameData) {}

    /**
     * @return array{generatedAt: string, live: int, events: list<array<string, mixed>>}
     */
    public function get(): array
    {
        // One cached copy per language: the headlines are translated (lang/pt_BR.json).
        return Cache::remember('l2j.events.'.app()->getLocale(), config('l2j.cache_seconds'), fn (): array => $this->build((int) round(microtime(true) * 1000)));
    }

    /**
     * @return array{generatedAt: string, live: int, events: list<array<string, mixed>>}
     */
    public function build(int $now): array
    {
        $game = DB::connection('game');

        $events = [
            ...$this->epicBosses($game->table('grandboss_data')->get(['boss_id', 'loc_x', 'loc_y', 'status', 'respawn_time'])->all(), $now),
            ...$this->sieges($game->table('castle as c')->leftJoin('clan_data as cd', 'cd.hasCastle', '=', 'c.id')
                ->get(['c.name', 'c.siegeDate', 'cd.clan_name'])->all(), $now),
            ...$this->olympiad($game->table('olympiad_data')->first(['period', 'validation_end']), $now),
            ...$this->sevenSigns($game->table('seven_signs_status')->first()),
            ...$this->teamVsTeam($now),
            ...$this->raidBosses($game->table('raidboss_spawnlist')->get(['boss_id', 'loc_x', 'loc_y', 'respawn_time'])->all(), $now),
        ];

        usort($events, fn (array $a, array $b): int => (self::STATE_ORDER[$a['state']] <=> self::STATE_ORDER[$b['state']])
            ?: ($this->sortTime($a) <=> $this->sortTime($b))
            ?: (($a['priority'] ?? 99) <=> ($b['priority'] ?? 99)));

        return [
            'generatedAt' => self::iso($now),
            'live' => count(array_filter($events, fn (array $e): bool => $e['state'] === 'live')),
            'events' => array_values($events),
        ];
    }

    /**
     * @param  list<object>  $rows
     * @return list<array<string, mixed>>
     */
    private function epicBosses(array $rows, int $now): array
    {
        $order = array_keys(self::EPIC);
        $events = [];

        foreach ($rows as $row) {
            $lore = self::EPIC[(int) $row->boss_id] ?? null;

            if ($lore === null) {
                continue;
            }

            $boss = $this->gameData->boss((int) $row->boss_id);
            $status = (int) $row->status;
            $respawn = (int) $row->respawn_time;
            $fourState = $lore['fourState'] ?? false;
            $dead = $fourState ? $status === 3 : $status === 1;

            [$state, $headline, $detail] = match (true) {
                $dead && $respawn > $now => ['slain', __($lore['slain']), __('Returns')],
                $fourState && $status === 1 => ['live', __($lore['gathering']), __('Challengers are entering the lair')],
                $fourState && $status === 2 => ['live', __($lore['fighting']), __('Battle in progress')],
                default => ['ready', __($lore['ready']), __('Awaits challengers')],
            };

            $events[] = [
                'id' => "epic-{$row->boss_id}",
                'category' => 'epic',
                'priority' => array_search((int) $row->boss_id, $order, true),
                'title' => $boss['name'],
                'level' => $boss['level'],
                'place' => __($lore['place']),
                'state' => $state,
                'headline' => $headline,
                'detail' => $detail,
                'returnsAt' => $state === 'slain' ? self::iso($respawn) : null,
                'at' => isset($lore['at'])
                    ? [self::pin($lore['at'], $lore['place'])]
                    : self::spawn((int) $row->loc_x, (int) $row->loc_y, $lore['place']),
            ];
        }

        return $events;
    }

    /**
     * @param  list<object>  $rows
     * @return list<array<string, mixed>>
     */
    private function raidBosses(array $rows, int $now): array
    {
        $alive = array_filter($rows, fn (object $r): bool => (int) $r->respawn_time <= $now);
        $slain = array_filter($rows, fn (object $r): bool => (int) $r->respawn_time > $now);
        usort($slain, fn (object $a, object $b): int => (int) $a->respawn_time <=> (int) $b->respawn_time);

        $events = [[
            'id' => 'raids-roaming',
            'category' => 'raid',
            'title' => __('Raid Bosses'),
            'place' => __('All across Aden'),
            'state' => $alive ? 'ready' : 'slain',
            'headline' => __(':alive of :total raid bosses roam the lands of Aden. Gather your party and claim their treasures.', ['alive' => count($alive), 'total' => count($rows)]),
            'detail' => __(':count roaming', ['count' => count($alive)]),
        ]];

        // The next five to return: the ones players will race for.
        foreach (array_slice($slain, 0, 5) as $row) {
            $boss = $this->gameData->boss((int) $row->boss_id);
            $events[] = [
                'id' => "raid-{$row->boss_id}",
                'category' => 'raid',
                'title' => $boss['name'],
                'level' => $boss['level'],
                'place' => __('Raid Boss'),
                'state' => 'slain',
                'headline' => __(':boss was slain by brave adventurers. It will return, and the race for its treasure begins again.', ['boss' => $boss['name']]),
                'detail' => __('Returns'),
                'returnsAt' => self::iso((int) $row->respawn_time),
                'at' => self::spawn((int) $row->loc_x, (int) $row->loc_y, $boss['name']),
            ];
        }

        return $events;
    }

    /**
     * Castles sharing a siege time are grouped ("Sieges of Aden, Dion and Giran").
     *
     * @param  list<object>  $rows
     * @return list<array<string, mixed>>
     */
    private function sieges(array $rows, int $now): array
    {
        $length = (int) ($this->config->number('siege.properties', 'SiegeLength', 120) * 60_000);
        $byStart = [];

        foreach ($rows as $castle) {
            $start = intdiv((int) $castle->siegeDate, 60_000) * 60_000; // L2J adds a few ms per castle

            if ($start === 0 || $start + $length <= $now) {
                continue;
            }

            $byStart[$start][] = $castle;
        }

        ksort($byStart);
        $events = [];

        foreach ($byStart as $start => $castles) {
            $names = array_map(fn (object $c): string => $c->name, $castles);
            $list = count($names) > 1 ? implode(', ', array_slice($names, 0, -1)).' '.__('and').' '.end($names) : $names[0];
            $owners = array_map(fn (object $c): string => __(':clan holds :castle', ['clan' => $c->clan_name, 'castle' => $c->name]), array_filter($castles, fn (object $c): bool => $c->clan_name !== null));
            $state = self::scheduleState($now, $start, $start + $length);

            $events[] = [
                'id' => "siege-{$start}",
                'category' => 'siege',
                'title' => count($names) > 1 ? __('Sieges of :list', ['list' => $list]) : __('Siege of :list', ['list' => $list]),
                'place' => count($names) > 1 ? __(':count castles', ['count' => count($names)]) : __(':name Castle', ['name' => $list]),
                'state' => $state,
                'headline' => $state === 'live'
                    ? __('The Siege of :list rages! Banners clash at the castle walls. Join your clan and claim the throne.', ['list' => $list])
                    : __('War drums sound across Aden. Clans gather their banners for the Siege of :list.', ['list' => $list]),
                'detail' => $owners ? implode(' · ', $owners) : __('Every castle is unclaimed. Any clan can take a throne.'),
                'startsAt' => self::iso($start),
                'endsAt' => self::iso($start + $length),
                'at' => array_values(array_filter(array_map(
                    fn (string $name): ?array => isset(self::CASTLES[$name]) ? self::pin(self::CASTLES[$name], "{$name} Castle") : null,
                    $names,
                ))),
            ];
        }

        return $events;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function olympiad(?object $row, int $now): array
    {
        if ($row === null) {
            return [];
        }

        if ((int) $row->period === 1) {
            return [[
                'id' => 'olympiad', 'category' => 'olympiad', 'title' => __('Grand Olympiad'), 'place' => __('Olympiad Stadium'), 'state' => 'live',
                'headline' => __('The Olympiad season has ended. The new Heroes of Aden are being crowned!'),
                'detail' => __('Hero validation'),
                'endsAt' => (int) $row->validation_end ? self::iso((int) $row->validation_end) : null,
                'at' => [self::pin(self::OLYMPIAD_STADIUM, 'Olympiad Stadium')],
            ]];
        }

        // Competition period: the arena opens every day at StartHour:StartMinute for CompetitionPeriod.
        [$start, $end] = self::dailyWindow(
            $now,
            (int) $this->config->number('olympiad.properties', 'StartHour', 18),
            (int) $this->config->number('olympiad.properties', 'StartMinute', 0),
            (int) $this->config->number('olympiad.properties', 'CompetitionPeriod', 21_600_000),
        );
        $state = self::scheduleState($now, $start, $end);

        return [[
            'id' => 'olympiad',
            'category' => 'olympiad',
            'title' => __('Grand Olympiad'),
            'place' => __('Olympiad Stadium'),
            'state' => $state,
            'headline' => $state === 'live'
                ? __('The Olympiad arena is open! Prove you are the best of your class and fight for the title of Hero.')
                : __('The Olympiad Stadium will open its gates tonight. Noblesse, sharpen your blades.'),
            'detail' => __('Daily matches for Noblesse'),
            'startsAt' => self::iso($start),
            'endsAt' => self::iso($end),
            'at' => [self::pin(self::OLYMPIAD_STADIUM, 'Olympiad Stadium')],
        ]];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function sevenSigns(?object $row): array
    {
        if ($row === null) {
            return [];
        }

        $period = (int) $row->active_period;
        $dawn = (int) $row->dawn_stone_score + (int) $row->dawn_festival_score;
        $dusk = (int) $row->dusk_stone_score + (int) $row->dusk_festival_score;
        $lead = match (true) {
            $dawn === $dusk => __('Dawn and Dusk stand even'),
            $dawn > $dusk => __('the Lords of Dawn lead'),
            default => __('the Revolutionaries of Dusk lead'),
        };
        $headlines = [
            __('The Seven Signs call for followers. Choose Dawn or Dusk before the competition begins.'),
            __('The war of the Seven Signs rages in the Necropolis and Catacombs: :lead.', ['lead' => $lead]),
            __('The Seven Signs competition is over: :lead. The seals are being decided.', ['lead' => $lead]),
            __('The seals of the Seven Signs are in force. Their power shapes Aden this week.'),
        ];

        return [[
            'id' => 'seven-signs',
            'category' => 'sevensigns',
            'title' => 'Seven Signs: '.__(self::SEVEN_SIGNS_PERIODS[$period] ?? 'Unknown'),
            'place' => __('Necropolis and Catacombs'),
            'state' => $period === 1 ? 'live' : 'scheduled',
            'headline' => $headlines[$period] ?? $headlines[1],
            'detail' => 'Dawn '.number_format($dawn).' · Dusk '.number_format($dusk),
            'at' => array_map(fn (string $name, array $px): array => self::pin($px, $name), array_keys(self::SEVEN_SIGNS_SITES), self::SEVEN_SIGNS_SITES),
        ]];
    }

    /**
     * Only when TvT is enabled in tvt.properties: registration opens at each Interval time, then the battle runs.
     *
     * @return list<array<string, mixed>>
     */
    private function teamVsTeam(int $now): array
    {
        if (! $this->config->flag('tvt.properties', 'Enabled', false)) {
            return [];
        }

        $participation = (int) ($this->config->number('tvt.properties', 'ParticipationTime', 30) * 60_000);
        $length = $participation + (int) ($this->config->number('tvt.properties', 'RunningTime', 20) * 60_000);
        $windows = [];

        foreach (array_filter(array_map('trim', explode(',', $this->config->get('tvt.properties', 'Interval', '9:00,15:00,21:00,3:00')))) as $time) {
            [$hour, $minute] = array_map('intval', array_pad(explode(':', $time), 2, 0));
            $windows[] = self::dailyWindow($now, $hour, $minute, $length);
        }

        if (! $windows) {
            return [];
        }

        usort($windows, fn (array $a, array $b): int => $a[0] <=> $b[0]);
        [$start, $end] = $windows[0];
        $state = self::scheduleState($now, $start, $end);
        $registering = $state === 'live' && $now < $start + $participation;
        // The battle is fought at the teams' start location; while registration is open, the event NPC is shown too.
        $at = self::configSpawn($this->config->get('tvt.properties', 'Team1Loc', '148695,46725,-3414'), 'Team vs Team arena');

        if ($registering) {
            array_push($at, ...self::configSpawn($this->config->get('tvt.properties', 'ParticipationNpcLoc', '83425,148585,-3406'), 'Team vs Team registration'));
        }

        return [[
            'id' => 'tvt',
            'category' => 'tvt',
            'title' => 'Team vs Team',
            'place' => __('Coliseum'),
            'state' => $state,
            'headline' => match (true) {
                $state !== 'live' => __('Two teams, one arena. The next Team vs Team battle is coming.'),
                $registering => __('Team vs Team registration is open! Join now and fight for glory.'),
                default => __('Team vs Team is underway! Two teams clash in the arena.'),
            },
            'detail' => $registering ? __('Registration open') : ($state === 'live' ? __('Battle in progress') : __('Next battle')),
            'startsAt' => self::iso($start),
            'endsAt' => self::iso($end),
            'at' => $at,
        ]];
    }

    /**
     * A named map point from a position on the map image, in pixels.
     *
     * @param  array{0: int, 1: int}  $pixels
     * @return array{x: float, y: float, name: string}
     */
    private static function pin(array $pixels, string $name): array
    {
        return [...WorldMap::pixel($pixels[0], $pixels[1]), 'name' => $name];
    }

    /**
     * A named map point from game coordinates; empty when the spot is not on the map.
     *
     * @return list<array{x: float, y: float, name: string}>
     */
    private static function spawn(int $x, int $y, string $name): array
    {
        $point = WorldMap::project($x, $y);

        return $point === null ? [] : [[...$point, 'name' => $name]];
    }

    /**
     * A named map point from an "x,y,z[,heading]" location in a config file.
     *
     * @return list<array{x: float, y: float, name: string}>
     */
    private static function configSpawn(string $location, string $name): array
    {
        $parts = array_map('intval', explode(',', $location));

        return count($parts) >= 2 ? self::spawn($parts[0], $parts[1], $name) : [];
    }

    /**
     * The current or next daily window starting at hour:minute and lasting $lengthMs, checking yesterday's
     * window too for windows that run past midnight.
     *
     * @return array{0: int, 1: int}
     */
    public static function dailyWindow(int $now, int $hour, int $minute, int $lengthMs): array
    {
        $today = CarbonImmutable::createFromTimestampMs($now, config('app.timezone'))->setTime($hour, $minute);

        foreach ([-1, 0, 1] as $dayOffset) {
            $start = (int) $today->addDays($dayOffset)->getTimestampMs();

            if ($start + $lengthMs > $now) {
                return [$start, $start + $lengthMs];
            }
        }

        $start = (int) $today->addDays(2)->getTimestampMs();

        return [$start, $start + $lengthMs];
    }

    private static function scheduleState(int $now, int $start, int $end): string
    {
        if ($now >= $start && $now < $end) {
            return 'live';
        }

        return $start - $now < self::DAY_MS ? 'soon' : 'scheduled';
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function sortTime(array $event): int
    {
        $time = $event['startsAt'] ?? $event['returnsAt'] ?? null;

        return $time ? (int) CarbonImmutable::parse($time)->getTimestampMs() : PHP_INT_MAX;
    }

    public static function iso(int $milliseconds): string
    {
        return CarbonImmutable::createFromTimestampMs($milliseconds)->toIso8601ZuluString('millisecond');
    }
}
