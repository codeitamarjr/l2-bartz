# L2J Server (High Five) on Docker — Raspberry Pi 5

Login server + game server + MariaDB, compiled from source in `src/` into one `linux/arm64` image, plus the
website: Laravel 13 + Inertia + React + Filament admin (`site/`, a second image).
The game client must be **Lineage 2 High Five Part 5** (protocols 267/268/271/273).

```
L2j/
├── src/                     L2J sources (login master, game/datapack develop, cli master)
├── Dockerfile               multi-stage build: Maven (JDK 25) -> runtime (JRE 25 + mariadb-client)
├── docker/entrypoint.sh     `l2j login | game | dbinstall | account ...`
├── docker/mariadb-init/     grants the L2J DB user on first DB start
├── site/                    website: Laravel + Inertia + React pages, Filament admin, FrankenPHP image
├── overrides/game/script/   custom game scripts, e.g. WebBridge (applies the website's queued actions)
├── docker-compose.yml       db + login + game + site (+ one-shot dbinstall)
├── .env.example             settings (copy to .env)
├── overrides/{login,game}/  optional config files copied over the defaults at start
└── build.sh                 builds both images and exports everything to dist/
```

## Addresses

Replace `<server-address>` with the server's address: `PUBLIC_HOST` in `.env` (the Pi's IP on your network, or
your domain name). The website port is `SITE_PORT` (default 8080).

| What | Address |
|---|---|
| Website | `http://<server-address>:8080` |
| Lore / About | `http://<server-address>:8080/lore` · `http://<server-address>:8080/about` |
| Map | `http://<server-address>:8080/map` (live world map; **Map** in the site menu) |
| Items | `http://<server-address>:8080/items` (item database; **Items** in the site menu) |
| Player area | `http://<server-address>:8080/account` (sign in with a game account) |
| Admin | `http://<server-address>:8080/admin` (website admins, see step 5) |
| Game | login server port 2106, game server port 7777 (see step 6) |

## Secrets and git

Passwords, keys and tokens live **only** in `.env` (on the Mac and on the Pi), never in the repository: `.gitignore`
excludes `.env`, `data/` (the database, including account password hashes), `dist/` and `src/`. Start from
`.env.example`, which lists every setting with placeholders. Change every `change-me` value before the first start:
the database passwords are written into the database then. To rotate a database password later, change it in MariaDB
(`ALTER USER ...`) and in `.env` together.

## 1. Build on the Mac

The L2J sources are four clones of the official repositories in `src/` (not in this repository):

```bash
git clone -b develop https://bitbucket.org/l2jserver/l2j-server-game.git src/l2j-server-game
git clone -b develop https://bitbucket.org/l2jserver/l2j-server-datapack.git src/l2j-server-datapack
git clone -b master https://bitbucket.org/l2jserver/l2j-server-login.git src/l2j-server-login
git clone -b master https://bitbucket.org/l2jserver/l2j-server-cli.git src/l2j-server-cli
```

Then:

```bash
./build.sh
```

This builds `l2j-server:latest` and `l2j-site:latest` for arm64 and writes `dist/` (one archive with both images,
compose file, init script, overrides, `.env.example`).

To update the sources later: `git -C src/l2j-server-game pull` (same for the others), then `./build.sh` again.

## 2. Copy to the Raspberry Pi

The Pi needs 64-bit Raspberry Pi OS and Docker (`curl -fsSL https://get.docker.com | sh`).

```bash
rsync -a dist/ <user>@<pi-host>:l2-server/
```

On the Pi:

```bash
cd ~/l2-server
docker load -i l2j-server-arm64.tar.gz
cp .env.example .env
nano .env        # set PUBLIC_HOST=<pi-ip>, change all passwords (DB, root, WEB_DB_PASSWORD, L2WEB_DB_PASSWORD)
docker run --rm --entrypoint php l2j-site:latest artisan key:generate --show   # paste into SITE_APP_KEY
```

### Updating the Pi later

On the Mac, after changing anything:

```bash
./build.sh
rsync -a dist/ <user>@<pi-host>:l2-server/
ssh <user>@<pi-host> 'cd ~/l2-server && docker load -i l2j-server-arm64.tar.gz && docker compose up -d'
```

`.env` and `data/` on the Pi are never overwritten by this (dist/ has neither). The Pi shares its memory with other
projects, so its `.env` caps the game server at `GAME_JAVA_OPTS=-Xms1g -Xmx3g` (it uses ~3 GB with geodata).

## 3. First start (installs the databases once)

```bash
docker compose up -d db
./get-geodata.sh
docker compose run --rm dbinstall
docker compose up -d
docker compose logs -f game
```

The game server is ready when the log says it is connected to the login server and listening on 7777.
`dbinstall` also creates the website's databases and users: `l2web` (the website's own database) and `web`
(read-only access to game data). The site runs its migrations by itself when it starts.

## 4. Create your GM account

```bash
docker compose run --rm --no-deps game account <name> <password> 8
```

Level 8 is master GM, 0 a normal player. Accounts are also auto-created on first login (`AutoCreateAccounts = True`).
GM rights in game come from the **character** (`characters.accesslevel`), so promote a character while it is offline.

## 5. Create your website admin

```bash
docker compose exec site php artisan make:filament-user
```

Then sign in at `http://<pi-ip>:8080/admin`. Admins are separate from game accounts (stored in `l2web.users`).

## 6. Connect the client (High Five Part 5)

On the PC/Mac that runs the client, point the official login host to the Pi, e.g. in the hosts file:

```
<pi-ip> l2authd.lineage2.com
```

or start the client with `l2.bin IP=<pi-ip>`. On macOS the client needs CrossOver/Whisky (Wine) or a Windows VM.

For players, the website offers a launcher: `site/public/downloads/start-L2-Bartz.bat` (served at
`/downloads/start-L2-Bartz.bat`, linked from About -> How to Connect). Placed in the client's `system` folder, it
asks for Administrator rights and starts `L2.bin IP=play.l2-bartz.itjunior.dev`, so no hosts file is needed and it
survives a change of home IP. Change the address in its PowerShell line if the game's domain changes. Keep its
Windows (CRLF) line endings.

Ports: TCP 2106 (login) and 7777 (game). Only forward them on your router if players outside your LAN should connect, and then set `PUBLIC_HOST` to your public IP or DNS name.

## Website (`site/`)

Laravel 13 + Inertia 3 + React 19 (TypeScript) + Filament 5, served by FrankenPHP on `http://<pi-ip>:8080`
(`SITE_PORT`). Same stack as the CRM.

| Page | File | Data |
|---|---|---|
| Landing `/` | `resources/js/pages/home.tsx` | Happening Now + LIVE pill (polls every 30 s), rates from the config |
| Lore `/lore` | `resources/js/pages/lore.tsx` | static: 9 chapters up to High Five, timeline, pantheon |
| Map `/map` | `resources/js/pages/map.tsx` | live world map: bosses, sieges, Olympiad, Seven Signs, TvT (polls every 30 s) |
| Items `/items`, `/items/{id}` | `resources/js/pages/items/` | item database: search, stats, drops and spoils at this server's rates, merchants, recipes |
| About `/about` | `resources/js/pages/about.tsx` | server status, events, rates, world stats, top players, castles (polls every 30 s) |
| Account `/account` | `resources/js/pages/account.tsx` | sign in with the game account; characters, status, items |
| Admin `/admin` | `app/Filament/` | Item Deliveries: Send Item + the delivery log |

Shared layout, header, phone menu and effects: `resources/js/layouts/site-layout.tsx`, `resources/js/hooks/`,
`resources/js/components/`. The design is `resources/css/app.css`; images are in `public/assets/` and videos in
`public/assets/video/`, named by page and role: `home-hero.mp4`, `home-join.webm` ("Your Legend Begins"),
`about-hero.mp4`, `account-hero.mp4`, each hero with a `-poster.jpg` (its first frame, shown while it loads).
Header videos are muted, H.264 with fast start, and only the poster is shown to visitors who prefer reduced motion.
Vite fingerprints the CSS/JS/fonts, so browsers never keep stale copies.

How the data gets there:
- **Live data** is Inertia page data from `app/Services/L2j/` (`ServerStatus`, `EventFeed`, `CharacterSheet`),
  cached 15 s, refreshed in place with Inertia polling.
- **Game data is read-only.** The `game` and `login` connections use the `web` database user: `SELECT` on the game
  database and only `login, password, accessLevel, lastactive, created_time` of `accounts` (the hash is needed for
  sign-in and never leaves the server). `UPDATE`/`DELETE` are refused by MariaDB.
- **Website data** (admins, sessions, cache, the action queue) is in its own `l2web` database (`l2web` user).

Player sign-in (`app/Auth/GameAccountUserProvider.php`, `AccountSessionController.php`): a separate `player` guard,
L2J's password format (base64 of SHA-1), CSRF protection, session ID renewed on sign-in, 5 wrong passwords per
account or 10 per IP in 15 minutes -> 15-minute lockout, the same message for unknown accounts and wrong passwords,
banned accounts refused, players only ever see their own characters. Behind a reverse proxy, set
`TRUSTED_PROXIES` so the real client IP is used (never `*`).

Over plain http, passwords travel unencrypted: fine on your own network. Before opening the site to the internet,
put HTTPS in front (a domain in Caddy's `SERVER_NAME`, or a Cloudflare Tunnel).

### Admin: sending items (the game bridge)

The website never writes game data. **Send Item** in the admin only adds a row to `l2web.game_actions`; the
**WebBridge** script inside the game server
([overrides/game/script/.../WebBridge.java](overrides/game/script/com/l2jserver/datapack/custom/WebBridge/WebBridge.java))
picks it up within 5 seconds and uses the game's own code:

- character online with room in the bag: straight into the inventory ("You have obtained ...");
- offline, bag full or too heavy: in-game system mail "A gift from Bartz" with the item attached.

Each row is claimed atomically before anything is given, so it can never be delivered twice. Unknown items or
characters and more than 100 non-stackable items fail with a reason. Rows interrupted by a game server restart are
marked failed (not retried) so a GM can check first. The log in the admin is an audit trail: no editing or deleting.

The entrypoint registers every `.java` under `overrides/game/script/` in `data/scripts.cfg` at start. Tested on
2026-10-27: 1000 Adena to an offline character by mail, plus unknown item / unknown character / too many
non-stackable items, all failing safely.

### Languages: English and Brazilian Portuguese

The site is in English and Brazilian Portuguese, like l2-kage. `app/Http/Middleware/SetLocale.php` picks the
language: the visitor's choice (the **EN | PT** switch in the header, kept in a `locale` cookie via `/locale/{en|pt_BR}`),
otherwise Portuguese for browsers that ask for it, otherwise English.

- **Pages** write both languages where the text is: `t('Map', 'Mapa')` from `resources/js/i18n.ts`, or `{ en, pt }`
  objects in data files. The lore page is two components, `components/lore/lore-en.tsx` and `lore-pt.tsx`; the event
  lore is `data/event-lore.ts` and `data/event-lore-pt.ts`. Keep each pair in step.
- **Server text** (page titles and descriptions, live event headlines, emails, form errors) uses Laravel's `__()`
  with the English text as the key; the Portuguese is in `site/lang/pt_BR.json` (and `lang/pt_BR/validation.php`).
  `tests/Feature/LocaleTest.php` checks both languages and that every entry keeps its `:placeholders`.
- Proper names stay in English in both languages (items, monsters, places on the map, the chronicle name).

### Game accounts: registration and password recovery

Players create their game account on the website (`/register`): account name, email and password. The account is
created in `l2jls.accounts` only when they click the confirmation link, so every account has a working email.
"Forgot password?" emails one reset link per account on that address (60 minutes, single use), and the player area
lets players change their password and their recovery email. The login server reads the password on every login, so
changes work in game at once. Code: `app/Services/GameAccounts.php`; tests: `tests/Feature/GameAccountsTest.php`.

Rules match the game client: account names 4-14 letters or digits (stored lowercase), passwords 6-16 characters
without spaces, at most 5 accounts per email (`ACCOUNTS_MAX_PER_EMAIL`). Links are stored only as hashes.

Until an email service is set, registration and password resets show "opens very soon" (`MAIL_MAILER=log`).
To switch them on, in the Pi's `.env`:

1. **Email (Resend)**: create an account at resend.com, add the domain `itjunior.dev` and copy the DNS records it
   shows into Cloudflare (DNS only). Create an API key, then set `MAIL_MAILER=smtp` and `MAIL_PASSWORD=<api key>`
   (host `smtp.resend.com`, user `resend` and `MAIL_FROM_ADDRESS=no-reply@itjunior.dev` are the defaults).
   **Or Amazon SES** (used on the Pi): verify the domain in SES, create SMTP credentials (SES -> SMTP settings), and
   set `MAIL_MAILER=smtp`, `MAIL_HOST=email-smtp.<region>.amazonaws.com`, `MAIL_USERNAME` and `MAIL_PASSWORD`.
   A new SES account is in the sandbox (sends only to verified addresses) until you request production access.
   Check it with `docker compose exec site php artisan mail:test you@example.com`.
2. **Bot check (optional, recommended)**: in Cloudflare, Turnstile -> Add widget for `l2-bartz.itjunior.dev`, then
   set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
3. `docker compose up -d` and try a registration with your own email.
4. **Stop in-game account creation** once registration works: `AUTO_CREATE_ACCOUNTS=False`, then
   `docker compose up -d`. Logging in with an unknown name then just fails, and the site's texts follow.

The website's database user may create accounts and change only their password and email; that grant is applied by
`docker compose --profile setup run --rm dbinstall` (safe to re-run on an installed server).

### Item database

`/items` searches all 19,199 High Five items; each item page shows its stats and properties, which monsters drop or
spoil it, which merchants sell it, and the recipes that make it or use it.

- **Data**: `node site/resources/data/build-itemdb.mjs` exports the datapack (item stats, NPC drop and spoil lists,
  merchant scripts, `recipes.xml`) to `site/resources/data/itemdb.ndjson.gz`. The site imports it into the
  `itemdb_*` tables on start (`php artisan itemdb:import`, skipped when the file is unchanged). Re-run the export
  after updating the datapack.
- **Chances** are computed the way the game server rolls them (`app/Services/L2j/ItemDatabase.php`): drop groups,
  the drop / spoil / raid / herb rates and the per-item rates (Adena amount x5) from the live `rates.properties`,
  and groups over 100% turning into larger amounts. Not included: champion bonuses and the level-gap penalty.
  Checked by `tests/Feature/ItemDatabaseTest.php`.
- **Icons**: until real ones are added, each item gets a drawn icon (its type, framed in its grade's colour). To use
  the game's icons, export them from your client with [UModel](https://www.gildor.org/en/projects/umodel) (open
  `system/Icon.utx`, export the textures), convert to WebP and put them in `site/public/assets/icons/`, named like
  the datapack's icon without the `icon.` prefix: `icon.weapon_kukuri_i00` -> `weapon_kukuri_i00.webp`. Each real
  icon replaces its placeholder automatically; rebuild the site image.

### Weekly gift box

Signed-in players open one box per game account per week (resets Monday 00:00 server time) on the Account page and
choose which character receives it (level 20 or higher, so fresh alt accounts can't farm it). The box arrives as
**one in-game mail** with every item attached (the WebBridge `send_mail` action); unopened mail expires after 15 days.
Each box holds the guaranteed items plus one bonus rolled by weight; enchant scrolls match the character's grade.
The odds are shown to players under "What's inside".

- Contents, odds, minimum level and mail text: `gift_box` in `site/config/l2j.php` (`GIFT_BOX_ENABLED=false` in `.env`
  turns it off). Rebuild the site image after changing it.
- Claims: `l2web.gift_claims` (unique per account and week). Each mail is also in the admin's Item Deliveries log.
- A failed delivery (e.g. the character was deleted) shows on the player's box; send the items from the admin.

### Developing the website

```bash
cd site
npm install && composer install
npm run build               # or npm run dev while editing
cd .. && docker buildx build --platform linux/arm64 -t l2j-site:latest --load site && docker compose up -d site
```

Game data used by the site (item names/grades, class names, XP table, boss names) is generated from the datapack:
`node site/resources/data/build-gamedata.mjs`. Race portraits: `site/resources/data/races/crop-races.sh`.

World map (`/map`, `resources/js/components/world-map.tsx`): the High Five map is drawn to scale, so game coordinates are
placed on it with a fixed transform fitted on 18 towns (`app/Services/L2j/WorldMap.php`, checked by
`tests/Feature/WorldMapTest.php`). Raid bosses come from `raidboss_spawnlist`; epic bosses, sieges, the Olympiad,
the Seven Signs and TvT get their spots from `EventFeed` (TvT follows `tvt.properties`). Raid spawns that fall on
blank parchment (instance zones such as the Pagan Temple, Hellbound's interior) are counted as "beyond the map"
using a land mask. The source image is `site/resources/data/map/aden-world-map.jpg`; `build-map.sh` there rebuilds
the WebP and the mask. Place names and their lore lines: `resources/js/data/world-map.ts`.

### Lore sources (internal)

Not shown on the site. `site/resources/js/pages/lore.tsx` and the "Legends of Aden" cards are original summaries written from
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
| [Lineage 2 Media: A history of Hellbound](https://lineage2media.com/history%20of%20hellbound%20and%20it%20s%20locations.html) | World map: Beleth escaping the dungeon under the Ivory Tower to Hellbound; warp gates in Heine and at the Wasteland |

From general Lineage II knowledge rather than a single source above: Baium's heirs Solina and Frintezza and the
split into the Kingdoms of Aden and Elmore, Valakas in the Forge of the Gods, Freya's castle beyond Schuttgart,
Hellbound, Keucereus, Ekimus (Seed of Infinity) and Tiat (Seed of Destruction). Re-check these first if in doubt.


## Configuration

- `.env` sets the managed values: DB credentials, `PUBLIC_HOST`, JVM memory.
- Any other setting goes in `overrides/`, which mirrors the server folder (`overrides/game/` → `/opt/l2j/game/`, same for login):
  - **`.properties` files: only the keys you change.** They are merged into the default file at start, so every
    other key keeps the L2J default. Example: [overrides/game/config/rates.properties](overrides/game/config/rates.properties).
  - Any other file (XML, data...) replaces the default as a whole.
  - A custom `overrides/game/config/ipconfig.xml` replaces the one generated from `PUBLIC_HOST`.

  To look up a key and its default: `docker compose run --rm --no-deps game cat /opt/l2j/game/config/<file>.properties`.
  Apply changes with `docker compose restart game` (or `login`).

### Rates

Set in [overrides/game/config/rates.properties](overrides/game/config/rates.properties) to match the website:
Experience/SP x10, Adena x5, Drop and Spoil chance x3, Raid Boss x1 (quest XP/SP x10, quest adena x5).
The website reads this same file, so its rates always match the server.

### Welcome message (in game)

Shown when a character enters the world:

| What | File |
|---|---|
| Big text in the middle of the screen (2 lines, 8 s) | [overrides/game/config/customs.properties](overrides/game/config/customs.properties) |
| Server news window | [overrides/game/data/html/servnews.htm](overrides/game/data/html/servnews.htm) (turned on in `general.properties`) |
| Announcements in chat at login, plus two that repeat every hour | [overrides/game/startup-sql/announcements.sql](overrides/game/startup-sql/announcements.sql) |

`%WEBSITE_URL%` in the news window and announcements is filled in from `.env` (`WEBSITE_URL`, default
`http://<PUBLIC_HOST>:<SITE_PORT>`). The news window uses the client's simple HTML (`<br>`, `<br1>`, `<center>`,
`<font color="LEVEL">`, `<table>`, client images like `L2UI_CH3.herotower_deco`); no HTML comments.

`overrides/game/startup-sql/*.sql` run against the game database every time the game server starts, before it loads
its data, so they must be safe to run repeatedly. Changes apply with `docker compose restart game`.

### Server name in the client's server list

The name comes from the **client**, not the server: `system\servername-e.dat` maps the server ID (ours is 1) to a
name, and on an official High Five client ID 1 is "Bartz". A client patched for another private server shows that
server's name instead. Fix it on the PC: use a clean High Five client, or edit `servername-e.dat` with an L2 file
editor (e.g. L2FileEdit) so ID 1 reads Bartz.

## Geodata

Geodata tells the server where walls, floors and slopes are, so monsters and players can't walk through them.
It is the official L2J High Five set (https://bitbucket.org/l2jgeo/l2j_geodata, `master`, last updated 2021-01-26):
203 region files, about 230 MB to download and 890 MB on disk, in `data/geodata/` (not part of `dist/`).

```bash
./get-geodata.sh
docker compose restart game
```

The game log should then show `GeoData: Loaded 203 regions.` With geodata the game server uses about 3.6 GB of RAM.

[overrides/game/config/geodata.properties](overrides/game/config/geodata.properties) turns on what geodata enables:
`PathFinding = 2` (monsters path around walls, computed from the geodata at runtime) and `CoordSynchronize = 2`
(the server corrects clients that drift through obstacles). Without geodata, delete that file.

## Data on disk

| Path | Contents |
|---|---|
| `data/mariadb/` | the databases: game (`l2jls`, `l2jgs`) and website (`l2web`) |
| `data/state/hexid.txt` | the game server's registration key with the login server |
| `data/logs/` | login and game logs |

Back up `data/mariadb` (or `docker compose exec db mariadb-dump ...`) before upgrades.

`docker compose down` keeps all of this; deleting `data/` resets the server.
