# Website

Landing page for the server ("Return to Aden", a plain HTML/CSS/JS port of the Lovable design),
served by the `web` service (nginx) in `docker-compose.yml` on `http://<pi-ip>:${WEB_PORT}` (default 8080).

```
web/
├── public/              static site, served as-is (edit and refresh, no rebuild needed)
│   ├── index.html       landing page (all its text)
│   ├── lore.html        History & Lore: 9 chapters up to High Five, chronicle timeline, pantheon
│   ├── about.html       live server status, rates, world stats, top players, castles, how to connect
│   ├── account.html     player area: sign in with the game account, characters, status, items
│   └── assets/
│       ├── style.css    colours/fonts at the top (:root), then one block per section
│       ├── app.js       header, phone menu, parallax, embers, race switcher (RACES texts), lore chapter menu, scroll reveals
│       ├── about.js     About page: fetches /api/status every 30 s and fills the page
│       ├── account.js   player area: sign in/out, character list, status bars, items tabs and search
│       ├── events.js    Happening Now (landing + About) and the hero LIVE pill: /api/events every 30 s, countdowns
│       ├── hero.jpg, hero-video.mp4
│       ├── bg.webm, about-hero.jpg, account-hero.jpg   battle video ("Your Legend Begins") and frames of it
│       │                at 14.2 s (About header) and 22.5 s (Account header)
│       ├── race-*.jpg   6 race portraits cut from source/races-guide.avif
│       └── favicon.svg
├── source/              not served: races-guide.avif + crop-races.sh (edit the x/y/width table and re-run)
└── nginx.conf           nginx site config, proxies /api/ to the api service
```

- Rates in the "Server Rates" section are static text (x10 / x5 / x3 / x1). They match
  `overrides/game/config/rates.properties`; change both together.
- The "Create Account" and "Download Client" buttons point to `#` for now.
- The lore stops at High Five on purpose (the server's chronicle): nothing from Goddess of Destruction or later.
- After editing CSS/JS, raise the `?v=` number on the `style.css` / `app.js` / `about.js` / `account.js` links in all four
  pages, so returning visitors don't keep an old copy.
- The menu shows inline from 1024 px; below that it opens from the menu button (six links don't fit on tablets/phones).
- After editing `nginx.conf`, run `docker compose restart web`.

## Lore sources (internal)

Not shown on the site. `public/lore.html` and the "Legends of Aden" cards are original summaries written from
these sources (researched 2026-10-26). Where they disagree, the page keeps to what they have in common, and it
stops at High Five on purpose: no Goddess of Destruction content (Shilen's return, Lindvior, Fafurion, Ertheia).

| Source | Used for |
|---|---|
| [StrategyWiki: Lineage II / History of Aden](https://strategywiki.org/wiki/Lineage_II/History_of_Aden) | Ch. I-II: creation, Einhasad and Gran Kain, the Giants, the five gods and their races, origin of Humans |
| [Wikibooks: Lineage 2 / History of Aden](https://en.wikibooks.org/wiki/Lineage_2/History_of_Aden) | Same text as StrategyWiki (open licence); cross-check for Ch. I-II |
| [Lineage 2 Wiki (Fandom): Myths and History](https://lineage2.fandom.com/wiki/Myths_and_History) | Ch. V-VII and the timeline: official chronicle stories (Children of Shilen, Shunaiman, Anakim and the Nephilim, Lilith and the Lilim, Seven Signs, Battle for Giran, clans, Noblesse, Olympiad) |
| [Lineage 2 Wiki (Fandom): Antharas](https://lineage2.fandom.com/wiki/Antharas?oldid=5533) | Ch. IV: dragons born of Gran Kain and Shilen, Antharas waiting in Dragon Valley for her return |
| [Predator: Lore Chapter 10, The Fall of the Giants](https://predator.ge/en/news/lineage-2-lore-chapter-10-the-fall-of-the-giants-and-the-end-of-the-age-of-gods) | Ch. III: Giants creating life, the Kamael as their weapon, Star Hammer / Hammer of Despair on Grandferion. Its later parts (Helios, Superion) are post-High Five and were left out |
| [Predator: The Seven Seals, Shilen, Shunaiman, Lilith and Elmoreden](https://predator.ge/en/news/the-complete-history-of-the-seven-seals-in-lineage-2-shilen-shunaiman-lilith-and-the-empire-of-elmoreden) | Background for Ch. IV-V (found in research, not read in full) |
| [Engadget: lore of Gracia Part 1](https://www.engadget.com/2008-07-03-lineage-ii-lore-of-upcoming-expansion-gracia-part-1.html) | Ch. VIII: Eva calling the Kamael to defend Aden, and the imbalance that infected Gracia |
| [Ten Ton Hammer: The Kamael hands-on preview](https://www.tentonhammer.com/articles/the-kamael-hands-on-preview-page-two) | Ch. III and VIII: Kamael made by the Giants, Isle of Souls sealed away |
| [Lineage 2 Revolution wiki: Hardin](https://l2revolution.gamepedia.com/Hardin) | Ch. VI: Baium persuaded by dark powers to build the Tower of Insolence (mobile spin-off, so treated as secondary) |
| [Wikipedia: Lineage II](https://en.wikipedia.org/wiki/Lineage_II) | Chronicle names and order for the timeline |

From general Lineage II knowledge rather than a single source above: Baium's heirs Solina and Frintezza and the
split into the Kingdoms of Aden and Elmore, Valakas in the Forge of the Gods, Freya's castle beyond Schuttgart,
Hellbound, Keucereus, Ekimus (Seed of Infinity) and Tiat (Seed of Destruction). Re-check these first if in doubt.

## API (`api/`)

`server.js` (stats), `events.js` (happening now) and `account.js` (player area). After changing any of them:
`docker compose up -d --build api`.

### Player area (`account.js`)

| Endpoint | |
|---|---|
| `POST /api/login` | `{"login","password"}`, checked like L2J does (base64 of SHA-1). Sets the `bz_session` cookie |
| `POST /api/logout` | ends the session |
| `GET /api/me` | account + character list |
| `GET /api/characters/:id` | status (HP/MP/CP, XP %, SP, karma, PvP/PK, fame, vitality, time played) and items (equipped, inventory, warehouse). Only for characters of the signed-in account |

Security:
- Read-only. It can't change anything in the game; the database user only has `SELECT`.
- Session cookie: random 256-bit token, `HttpOnly`, `SameSite=Strict`, `Path=/api`, 2 hours sliding (`Secure` too
  when served over https). Sessions live in the API's memory, so restarting the API signs everyone out.
- Sign-in from other sites is refused (Origin check). nginx passes the real host (`$http_host`) for that check.
- 5 wrong passwords per account or 10 per IP in 15 minutes -> blocked for 15 minutes. The IP comes from
  `X-Real-IP`, set by nginx (the API has no published port, so it can't be spoofed from outside).
- Unknown accounts and wrong passwords get the same answer; banned accounts (access level < 0) can't sign in.
- Bodies over 4 KB are refused by nginx (413), anything malformed by the API (400).
- Passwords travel in plain text over http. Fine on your own network; put HTTPS in front (Caddy or a
  Cloudflare Tunnel) before opening the site to the internet. The sign-in form warns when the page is http.

Item names, types and grades, class names and the XP table come from `api/data/gamedata.json`, generated from the
datapack: `node api/tools/build-gamedata.mjs` (re-run after updating `src/l2j-server-datapack`).

Tested on 2026-10-27 with a temporary account (since deleted): sign-in/out, wrong password, lockout, other
accounts' characters (404), cross-site sign-in (403), oversized body (413/400), and real character data.

### Happening now (`events.js`)

`GET /api/events` (cached 15 s) feeds the "Happening Now" section on the landing page (live and upcoming
highlights, max 6) and the About page (everything), plus the "LIVE NOW" pill in the landing hero.

| Event | Source | States |
|---|---|---|
| Epic bosses: Antharas, Valakas, Baium, Beleth, Queen Ant, Core, Orfen | `grandboss_data` (status codes from each boss's AI script) | live (heroes entering / fighting), ready, slain (returns at) |
| Raid bosses | `raidboss_spawnlist` + names/levels from the datapack | how many roam, the next 5 to return |
| Castle sieges | `castle.siegeDate` + `SiegeLength` (default 120 min) | live, soon (< 24 h), scheduled; castles at the same time are grouped |
| Grand Olympiad | `olympiad_data` + daily `StartHour`/`CompetitionPeriod` (18:00, 6 h) | live (arena open / Hero crowning), soon |
| Seven Signs | `seven_signs_status` | live in the competition period, Dawn vs Dusk score |
| Team vs Team | `tvt.properties` (`Enabled`, `Interval`) | only when enabled: registration / battle / next |

Every event has a lore-flavoured headline that changes with its state; edit them in `api/events.js` (`EPIC`,
and the `headline` texts in each function). Timings honour `overrides/game/config/{siege,olympiad,tvt}.properties`
when you set those keys there. Daily times (Olympiad, TvT) use the server's time zone, UTC unless `TZ` is set.

Tested on 2026-10-27 with the real server data and with simulated states (bosses fighting, slain and returning,
a siege in progress, Hero crowning, TvT registration), without touching the game database.

### Stats (`server.js`)

`GET /api/status` returns one JSON document, cached for 15 seconds so visitors can't load the database:

| Field | Source |
|---|---|
| `status.login`, `status.game` | TCP check of `login:2106` and `game:7777` |
| `status.database` | false when the queries fail (the page then says world stats are unavailable) |
| `players.online`, `totals`, `races` | `l2jgs.characters`, `l2jgs.clan_data`, `l2jls.accounts` (counted by `login` only) |
| `top.level`, `top.pvp` | `l2jgs.characters`, GMs (`accesslevel > 0`) excluded |
| `castles` | `l2jgs.castle` + owner from `clan_data.hasCastle` |
| `rates` | `overrides/game/config/rates.properties` (mounted read-only; missing keys = retail x1) |
| `server.geodataRegions` | number of `*.l2j` files in `data/geodata` |
| `server.address` | `PUBLIC_HOST` from `.env` |

Database access is the `web` user created by `dbinstall`: `SELECT` on the game database and only the
`login, password, accessLevel, lastactive, created_time` columns of `l2jls.accounts` (the hash is needed for
sign-in and never leaves the API). It can't change anything: `UPDATE` and `DELETE` are denied.

If the API is down, nginx answers `/api/status` with 502 and the About page shows the servers as "Unknown"
and keeps the configured rates. After changing `api/server.js`: `docker compose up -d --build api`.

## Ideas for later

Done: sign-in, characters, status, items. Possible next steps: clan pages, Olympiad/Hero rankings
(`l2jgs.olympiad_nobles`, `l2jgs.heroes`), an interactive world map (character `x`/`y`), events,
and wiring the landing page's "Create Account" button (L2J creates accounts on first game login).

Security notes for later:
- Never publish MariaDB's port; only `web` (and the game ports) should be reachable.
- Never write to the game DB from the website while the game server is running (it caches characters in memory).
- Put HTTPS in front (Caddy or a Cloudflare Tunnel) before people type their game passwords into it.
- Rate-limit the sign-in endpoint; it checks the same passwords as the game.
