#!/bin/bash
# The L2J CLI creates the login/game databases itself, so the L2J user needs global rights.
# Runs once, when the MariaDB data volume is first created.
mariadb -uroot -p"${MARIADB_ROOT_PASSWORD}" -e "GRANT ALL PRIVILEGES ON *.* TO '${MARIADB_USER}'@'%'; FLUSH PRIVILEGES;"
