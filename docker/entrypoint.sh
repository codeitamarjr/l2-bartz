#!/usr/bin/env bash
# L2J container entrypoint.
#   l2j login                          run the login server
#   l2j game                           run the game server
#   l2j dbinstall                      install both databases (skipped if they already exist)
#   l2j account <name> <pass> [level]  create/update an account (level 8 = GM master)
#   l2j <anything else>                exec it (e.g. bash)
set -euo pipefail

L2J=/opt/l2j

: "${DB_HOST:=db}" "${DB_PORT:=3306}" "${DB_USER:=l2j}" "${DB_PASSWORD:=l2jserver2019}"
: "${LOGIN_DB:=l2jls}" "${GAME_DB:=l2jgs}" "${LOGIN_HOST:=login}" "${PUBLIC_HOST:=127.0.0.1}"
: "${LOGIN_JAVA_OPTS:=-Xms128m -Xmx256m}" "${GAME_JAVA_OPTS:=-Xms1g -Xmx4g}"

log() { echo "[l2j] $*"; }

# set_prop <file> <key> <value>: rewrites "Key = value" in a .properties file, appending it if missing.
set_prop() {
	local file=$1 key=$2 value
	value=$(printf '%s' "$3" | sed -e 's/[\\|&]/\\&/g')
	if grep -qE "^${key}[[:space:]]*=" "$file"; then
		sed -i -E "s|^${key}[[:space:]]*=.*|${key} = ${value}|" "$file"
	else
		printf '%s = %s\n' "$key" "$3" >> "$file"
	fi
}

mysql_cmd() {
	mariadb --skip-ssl -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$@"
}

wait_for_db() {
	log "Waiting for MariaDB at ${DB_HOST}:${DB_PORT}..."
	for _ in $(seq 1 90); do
		if mysql_cmd -e 'SELECT 1' >/dev/null 2>&1; then
			return 0
		fi
		sleep 2
	done
	log "MariaDB is not reachable, giving up."
	exit 1
}

db_exists() {
	[ "$(mysql_cmd -N -e "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='$1'")" = "1" ]
}

# Files mounted under /opt/l2j/overrides/<server>/ mirror the server folder.
# A .properties file that exists in the server only needs the keys you change: they are merged one by one,
# so every other key keeps the L2J default. Any other file replaces the default as a whole.
apply_overrides() {
	local server=$1 src="$L2J/overrides/$1" file rel target line key value
	[ -d "$src" ] || return 0
	while IFS= read -r -d '' file; do
		rel=${file#"$src"/}
		# startup-sql/ is run against the database by run_game, not copied into the server.
		[[ $rel == startup-sql/* ]] && continue
		target="$L2J/$server/$rel"
		if [[ $rel == *.properties && -f $target ]]; then
			log "Merging overrides/$server/$rel"
			while IFS= read -r line || [ -n "$line" ]; do
				[[ $line =~ ^[[:space:]]*([A-Za-z0-9_.]+)[[:space:]]*=[[:space:]]*(.*[^[:space:]])?[[:space:]]*$ ]] || continue
				key=${BASH_REMATCH[1]}
				value=${BASH_REMATCH[2]}
				set_prop "$target" "$key" "$value"
			done < "$file"
		else
			log "Copying overrides/$server/$rel"
			mkdir -p "$(dirname "$target")"
			cp "$file" "$target"
		fi
	done < <(find "$src" -type f -print0)
}

run_login() {
	cd "$L2J/login"
	apply_overrides login
	set_prop config/database.properties URL "jdbc:mariadb://${DB_HOST}:${DB_PORT}/${LOGIN_DB}"
	set_prop config/database.properties User "$DB_USER"
	set_prop config/database.properties Password "$DB_PASSWORD"
	set_prop config/server.properties EnableUPnP False
	# Game servers connect from another container, so listen on all interfaces.
	set_prop config/server.properties GameServerHost '*'
	# False = accounts are only created on the website (with an email), not by logging in with a new name.
	set_prop config/server.properties AutoCreateAccounts "${AUTO_CREATE_ACCOUNTS:-True}"
	wait_for_db
	log "Starting login server"
	# shellcheck disable=SC2086
	exec java $LOGIN_JAVA_OPTS -jar l2jlogin.jar
}

run_game() {
	cd "$L2J/game"
	apply_overrides game
	set_prop config/database.properties URL "jdbc:mariadb://${DB_HOST}:${DB_PORT}/${GAME_DB}"
	set_prop config/database.properties User "$DB_USER"
	set_prop config/database.properties Password "$DB_PASSWORD"
	set_prop config/server.properties EnableUPnP False
	set_prop config/server.properties LoginHost "$LOGIN_HOST"

	# The address handed to clients after login: your Raspberry Pi's IP (or a DNS name).
	if [ ! -f "$L2J/overrides/game/config/ipconfig.xml" ]; then
		cat > config/ipconfig.xml <<-EOF
		<?xml version="1.0" encoding="UTF-8"?>
		<gameserver address="${PUBLIC_HOST}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="ipconfig.xsd">
			<define subnet="127.0.0.0/8" address="127.0.0.1" />
		</gameserver>
		EOF
	fi

	# Keep the game server's registration key across container rebuilds.
	ln -sf "$L2J/state/hexid.txt" config/hexid.txt

	# Custom scripts in overrides/game/script/ (copied above) are added to data/scripts.cfg so the game loads them
	# at startup (e.g. the website bridge). L2J's own list is kept; lines are only appended once.
	local script rel
	while IFS= read -r -d '' script; do
		rel=${script#"$L2J/overrides/game/script/"}
		if ! grep -qxF "$rel" data/scripts.cfg; then
			log "Registering script $rel"
			printf '\n# Added from overrides/game/script\n%s\n' "$rel" >> data/scripts.cfg
		fi
	done < <(find "$L2J/overrides/game/script" -name '*.java' -print0 2>/dev/null)

	# The website address shown to players (server news window, announcements).
	local website=${WEBSITE_URL:-}
	if [ -f data/html/servnews.htm ]; then
		sed -i "s|%WEBSITE_URL%|${website//|/\\|}|g" data/html/servnews.htm
	fi

	wait_for_db
	if ! db_exists "$GAME_DB"; then
		log "Database '$GAME_DB' not found. Run 'docker compose run --rm dbinstall' first."
		exit 1
	fi

	# overrides/game/startup-sql/*.sql run against the game database on every start, before the server
	# loads its data (e.g. announcements). They must be safe to run again and again.
	local sql
	for sql in "$L2J/overrides/game/startup-sql/"*.sql; do
		[ -f "$sql" ] || continue
		log "Applying overrides/game/startup-sql/$(basename "$sql")"
		sed "s|%WEBSITE_URL%|${website//|/\\|}|g" "$sql" | mysql_cmd "$GAME_DB"
	done
	log "Starting game server (clients will be sent to ${PUBLIC_HOST}:7777)"
	# shellcheck disable=SC2086
	exec java $GAME_JAVA_OPTS -jar l2jserver.jar
}

run_dbinstall() {
	wait_for_db
	cd "$L2J/cli"
	local url="jdbc:mariadb://${DB_HOST}:${DB_PORT}"
	if db_exists "$LOGIN_DB"; then
		log "Database '$LOGIN_DB' already exists, skipping."
	else
		log "Installing login database '$LOGIN_DB'"
		java -jar l2jcli.jar db install -sql "$L2J/login/sql" -url "$url" -db "$LOGIN_DB" \
			-u "$DB_USER" -p "$DB_PASSWORD" -m FULL -t LOGIN -c -mods
	fi
	if db_exists "$GAME_DB"; then
		log "Database '$GAME_DB' already exists, skipping."
	else
		log "Installing game database '$GAME_DB' (takes a few minutes)"
		java -jar l2jcli.jar db install -sql "$L2J/game/sql" -url "$url" -db "$GAME_DB" \
			-u "$DB_USER" -p "$DB_PASSWORD" -m FULL -t GAME -c -mods
	fi
	# The CLI exits 0 even when it fails, so check the result ourselves.
	if [ "$(mysql_cmd -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$LOGIN_DB' AND table_name='accounts'")" != "1" ] \
		|| [ "$(mysql_cmd -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$GAME_DB' AND table_name='characters'")" != "1" ]; then
		log "Database install FAILED, see the output above."
		exit 1
	fi
	log "Database install finished."
	setup_web_user
}

# The website's database user: reads every game table; on accounts it reads what sign-in needs, creates accounts
# (registration on the website) and changes only their password and email (reset / change). Needs root because the
# L2J user cannot grant. Safe to re-run: `docker compose --profile setup run --rm dbinstall` re-applies it.
setup_web_user() {
	if [ -z "${WEB_DB_PASSWORD:-}" ] || [ -z "${DB_ROOT_PASSWORD:-}" ]; then
		log "WEB_DB_PASSWORD or DB_ROOT_PASSWORD not set, skipping the website's read-only database user."
		return 0
	fi
	local pass=${WEB_DB_PASSWORD//\'/\'\'}
	mariadb --skip-ssl -h "$DB_HOST" -P "$DB_PORT" -u root -p"$DB_ROOT_PASSWORD" <<-EOF
	CREATE USER IF NOT EXISTS 'web'@'%' IDENTIFIED BY '${pass}';
	ALTER USER 'web'@'%' IDENTIFIED BY '${pass}';
	GRANT SELECT ON \`${GAME_DB}\`.* TO 'web'@'%';
	GRANT SELECT (login, password, email, accessLevel, lastactive, created_time) ON \`${LOGIN_DB}\`.accounts TO 'web'@'%';
	GRANT INSERT (login, password, email, accessLevel) ON \`${LOGIN_DB}\`.accounts TO 'web'@'%';
	GRANT UPDATE (password, email) ON \`${LOGIN_DB}\`.accounts TO 'web'@'%';
	FLUSH PRIVILEGES;
	EOF
	log "Website database user 'web' is ready (reads the game; creates accounts, updates password/email)."
	setup_site_db
}

# The website's own database (l2web): admins, sessions, the game action queue... Its user can only touch l2web.
# The game server's bridge reads and updates l2web.game_actions with the L2J user. Safe to re-run.
setup_site_db() {
	if [ -z "${L2WEB_DB_PASSWORD:-}" ] || [ -z "${DB_ROOT_PASSWORD:-}" ]; then
		log "L2WEB_DB_PASSWORD or DB_ROOT_PASSWORD not set, skipping the website database."
		return 0
	fi
	local pass=${L2WEB_DB_PASSWORD//\'/\'\'}
	mariadb --skip-ssl -h "$DB_HOST" -P "$DB_PORT" -u root -p"$DB_ROOT_PASSWORD" <<-EOF
	CREATE DATABASE IF NOT EXISTS \`l2web\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
	CREATE USER IF NOT EXISTS 'l2web'@'%' IDENTIFIED BY '${pass}';
	ALTER USER 'l2web'@'%' IDENTIFIED BY '${pass}';
	GRANT ALL PRIVILEGES ON \`l2web\`.* TO 'l2web'@'%';
	FLUSH PRIVILEGES;
	EOF
	log "Website database 'l2web' is ready."
}

run_account() {
	local name=${1:?usage: l2j account <name> <password> [accessLevel]}
	local pass=${2:?usage: l2j account <name> <password> [accessLevel]}
	local level=${3:-0}
	[[ $level =~ ^-?[0-9]+$ ]] || { log "accessLevel must be a number"; exit 1; }
	wait_for_db
	# Same hashing as L2J: base64(sha1(password)).
	mysql_cmd "$LOGIN_DB" <<-EOF
	INSERT INTO accounts (login, password, accessLevel)
	VALUES ('${name//\'/\'\'}', TO_BASE64(UNHEX(SHA1('${pass//\'/\'\'}'))), ${level})
	ON DUPLICATE KEY UPDATE password = VALUES(password), accessLevel = VALUES(accessLevel);
	EOF
	log "Account '$name' saved with access level $level."
}

case "${1:-game}" in
	login) run_login ;;
	game) run_game ;;
	dbinstall) run_dbinstall ;;
	account) shift; run_account "$@" ;;
	*) exec "$@" ;;
esac
