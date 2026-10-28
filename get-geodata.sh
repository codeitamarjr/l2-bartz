#!/usr/bin/env bash
# Downloads the L2J High Five geodata (https://bitbucket.org/l2jgeo/l2j_geodata, master branch)
# into data/geodata/, where the game server loads it from. About 230 MB to download, 890 MB on disk.
# Then: docker compose restart game
set -euo pipefail
cd "$(dirname "$0")"

URL=${GEODATA_URL:-https://bitbucket.org/l2jgeo/l2j_geodata/get/master.zip}
DEST=data/geodata

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "Downloading geodata from $URL"
curl -fL --progress-bar -o "$tmp/geodata.zip" "$URL"

mkdir -p "$DEST"
unzip -q -j -o "$tmp/geodata.zip" '*/geodata/*.l2j' '*/LICENSE' -d "$DEST"
commit=$(unzip -Z1 "$tmp/geodata.zip" | head -1 | sed -E 's|.*-([0-9a-f]+)/.*|\1|')
echo "$commit https://bitbucket.org/l2jgeo/l2j_geodata" > "$DEST/VERSION.txt"

echo "Installed $(ls "$DEST"/*.l2j | wc -l | tr -d ' ') region files ($(du -sh "$DEST" | cut -f1)) from commit $commit."
echo "Restart the game server to load them: docker compose restart game"
