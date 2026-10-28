#!/usr/bin/env bash
# Builds the L2J server and website images for linux/arm64 (Raspberry Pi 5) and exports them, with everything
# else the Pi needs, to dist/ for copying to the Pi.
set -euo pipefail
cd "$(dirname "$0")"

IMAGE=${L2J_IMAGE:-l2j-server:latest}
SITE_IMAGE=${SITE_IMAGE:-l2j-site:latest}

docker buildx build --platform linux/arm64 -t "$IMAGE" --load .
docker buildx build --platform linux/arm64 -t "$SITE_IMAGE" --load site

mkdir -p dist
# One archive with both images: on the Pi, `docker load -i l2j-server-arm64.tar.gz` loads them together.
docker save "$IMAGE" "$SITE_IMAGE" | gzip > dist/l2j-server-arm64.tar.gz
cp docker-compose.yml .env.example README.md get-geodata.sh dist/
rm -rf dist/overrides dist/docker dist/web dist/api
mkdir -p dist/docker dist/overrides/login dist/overrides/game
cp -R overrides/. dist/overrides/
cp -R docker/mariadb-init dist/docker/
echo "Done: dist/ is ready to copy to the Pi"
ls -lh dist/l2j-server-arm64.tar.gz
