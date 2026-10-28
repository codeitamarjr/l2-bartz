-- Bartz announcements. Applied to the game database every time the game server starts (before it loads
-- them), so this file is the source of truth: edit it and run `docker compose restart game`.
-- Keep it idempotent. %WEBSITE_URL% is filled in from .env.
-- Removes L2J's stock announcements and the previous version of these; announcements a GM adds in game
-- (other authors) are left alone.
-- type: 0 = shown in chat at login, 1 = same in red, 3 = repeats for everyone online.
-- initial / delay are milliseconds; repeat -1 = forever.
DELETE FROM announcements WHERE author IN ('L2JServer', 'Bartz');

INSERT INTO announcements (type, initial, delay, `repeat`, author, content) VALUES
(0, 0, 0, 0, 'Bartz', 'Welcome to Bartz! The gods are silent, the dragons awaken, and Aden calls for heroes once more.'),
(0, 0, 0, 0, 'Bartz', 'Rates: XP/SP x10, Adena x5, Drop x3, Raid Boss x1. Good hunting, adventurer!'),
(0, 0, 0, 0, 'Bartz', 'Live status, rankings and the lore of Aden: %WEBSITE_URL%'),
(3, 1800000, 3600000, -1, 'Bartz', 'Castles of Aden await their lords. Gather your clan and claim a throne in the weekly sieges!'),
(3, 3600000, 3600000, -1, 'Bartz', 'Antharas and Valakas are stirring. Only the bravest alliances will survive their lairs.');
