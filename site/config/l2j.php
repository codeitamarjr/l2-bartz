<?php

/*
 * The L2J server this website belongs to. In Docker these come from docker-compose.yml / .env.
 */
return [
    'server_name' => env('L2J_SERVER_NAME', 'Bartz'),

    // Hosts of the login (2106) and game (7777) servers, used for the online/offline checks.
    'login_host' => env('L2J_LOGIN_HOST', 'login'),
    'game_host' => env('L2J_GAME_HOST', 'game'),

    // The address players connect to (shown on the About page).
    'public_host' => env('L2J_PUBLIC_HOST'),

    // overrides/game/config mounted read-only: rates, siege, olympiad, tvt... (missing keys = L2J defaults).
    'config_dir' => env('L2J_CONFIG_DIR', '/config'),

    // data/geodata mounted read-only, only to count the loaded regions.
    'geodata_dir' => env('L2J_GEODATA_DIR', '/geodata'),

    // Item names/types/grades, class names, XP table and boss names, generated from the datapack.
    'gamedata' => resource_path('data/gamedata.json'),

    // How long live server data (status, events) is cached.
    'cache_seconds' => (int) env('L2J_CACHE_SECONDS', 15),

    /*
     * Game accounts created on the website (register, confirm by email, reset password). Names follow what the
     * game client accepts: up to 14 letters or digits (the login server lowercases them); passwords up to 16.
     */
    'accounts' => [
        'max_per_email' => (int) env('ACCOUNTS_MAX_PER_EMAIL', 5),
        // Mirrors the login server's AutoCreateAccounts (docker-compose passes the same AUTO_CREATE_ACCOUNTS).
        'auto_create' => filter_var(env('AUTO_CREATE_ACCOUNTS', true), FILTER_VALIDATE_BOOL),
        'register_link_hours' => 24,
        'reset_link_minutes' => 60,
    ],

    /*
     * Weekly gift box (player area). One box per game account per week, sent by in-game mail to a character of the
     * player's choice (min_level or higher, so fresh alt accounts can't farm it). Each box holds every "guaranteed"
     * item plus one "bonus" rolled by weight. A bonus item can be a fixed item id or a grade key, which becomes the
     * scroll for the character's equipment grade (see "grades"). Item ids are High Five's (resources/data/gamedata.json).
     * A mail carries at most 8 attachments, so keep guaranteed + 1 bonus <= 8.
     */
    'gift_box' => [
        'enabled' => (bool) env('GIFT_BOX_ENABLED', true),
        'min_level' => (int) env('GIFT_BOX_MIN_LEVEL', 20),
        'mail_subject' => 'Your weekly gift box',
        'mail_text' => 'A gift from the Bartz staff for this week\'s adventures. Take the items from the attachments. Good hunting!',

        'guaranteed' => [
            ['item' => 57, 'count' => 250_000],   // Adena
            ['item' => 1538, 'count' => 3],       // Blessed Scroll of Escape
            ['item' => 1539, 'count' => 30],      // Greater Healing Potion
            ['item' => 1374, 'count' => 5],       // Greater Haste Potion
        ],

        'bonus' => [
            ['item' => 'enchant_armor', 'count' => 2, 'weight' => 30],
            ['item' => 'enchant_weapon', 'count' => 1, 'weight' => 25],
            ['item' => 57, 'count' => 1_000_000, 'weight' => 15],  // Adena jackpot
            ['item' => 5592, 'count' => 20, 'weight' => 10],       // Greater CP Potion
            ['item' => 6622, 'count' => 1, 'weight' => 10],        // Giant's Codex
            ['item' => 'blessed_enchant_weapon', 'count' => 1, 'weight' => 7],
            ['item' => 8762, 'count' => 1, 'weight' => 3],         // Top-Grade Life Stone - Level 76
        ],

        // Equipment grade by character level, and that grade's scrolls.
        'grades' => [
            'D' => ['from' => 20, 'enchant_weapon' => 955, 'enchant_armor' => 956, 'blessed_enchant_weapon' => 6575],
            'C' => ['from' => 40, 'enchant_weapon' => 951, 'enchant_armor' => 952, 'blessed_enchant_weapon' => 6573],
            'B' => ['from' => 52, 'enchant_weapon' => 947, 'enchant_armor' => 948, 'blessed_enchant_weapon' => 6571],
            'A' => ['from' => 61, 'enchant_weapon' => 729, 'enchant_armor' => 730, 'blessed_enchant_weapon' => 6569],
            'S' => ['from' => 76, 'enchant_weapon' => 959, 'enchant_armor' => 960, 'blessed_enchant_weapon' => 6577],
        ],
    ],
];
