# L2J Server (High Five) — login server, game server and CLI in one image.
# Built natively for linux/arm64 on Apple Silicon; runs as-is on a Raspberry Pi 5 (64-bit OS).

# ---------------------------------------------------------------------------
# Build stage: compile login, game, datapack and CLI from ./src
# ---------------------------------------------------------------------------
FROM eclipse-temurin:25-jdk AS build

RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY src/ ./

# The datapack depends on the game artifact, so the game is installed into the local Maven repo first.
RUN --mount=type=cache,target=/root/.m2 \
    set -eux; \
    for p in l2j-server-login l2j-server-game l2j-server-datapack l2j-server-cli; do \
      (cd "$p" && chmod 755 mvnw && ./mvnw -B -ntp install -DskipTests); \
    done

RUN set -eux; \
    mkdir -p /out/login /out/game /out/cli; \
    unzip -q l2j-server-login/target/l2j-server-login-*.zip -d /out/login; \
    unzip -q l2j-server-game/target/l2j-server-game-*.zip -d /out/game; \
    unzip -q -o l2j-server-datapack/target/l2j-server-datapack-*.zip -d /out/game; \
    unzip -q l2j-server-cli/target/l2jcli-*.zip -d /out/cli; \
    mkdir -p /out/game/data/geodata /out/game/logs /out/login/logs

# ---------------------------------------------------------------------------
# Runtime stage (JDK, not JRE: the game server compiles the datapack scripts at startup)
# ---------------------------------------------------------------------------
FROM eclipse-temurin:25-jdk

RUN apt-get update \
 && apt-get install -y --no-install-recommends mariadb-client \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /out/ /opt/l2j/
COPY docker/entrypoint.sh /usr/local/bin/l2j
RUN chmod 755 /usr/local/bin/l2j \
 && mkdir -p /opt/l2j/state /opt/l2j/overrides

# Settings come from the environment (see .env.example); defaults live in the entrypoint.

# 2106 = login (client), 9014 = login <-> game (internal), 7777 = game (client)
EXPOSE 2106 7777 9014

ENTRYPOINT ["l2j"]
CMD ["game"]
