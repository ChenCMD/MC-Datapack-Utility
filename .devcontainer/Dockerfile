FROM mcr.microsoft.com/devcontainers/typescript-node:4-24-trixie

USER root

ENV HOME=/home/node

# Keep the v1 lockfile workflow independent of the base image's Yarn version.
RUN npm install --global --prefix /opt/mcdu-yarn yarn@1.22.22 \
    && ln -sf /opt/mcdu-yarn/bin/yarn /usr/local/bin/yarn \
    && ln -sf /opt/mcdu-yarn/bin/yarnpkg /usr/local/bin/yarnpkg \
    && test "$(yarn --version)" = "1.22.22"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates chromium curl gh jq python3 ripgrep rsync \
    && rm -rf /var/lib/apt/lists/*

# Keep CLI executables in the image rather than the persistent home.
ARG CODEX_VERSION=latest
RUN npm install --global "@openai/codex@${CODEX_VERSION}"
RUN curl -fsSL https://claude.ai/install.sh -o /tmp/install-claude.sh \
    && bash /tmp/install-claude.sh stable \
    && install -m 0755 "$(readlink -f "$HOME/.local/bin/claude")" /usr/local/bin/claude \
    && rm /tmp/install-claude.sh \
    && rm -rf "$HOME/.local/share/claude" "$HOME/.local/bin/claude"

COPY scripts/google-chrome /usr/local/bin/google-chrome
RUN chmod 0755 /usr/local/bin/google-chrome \
    && ln -s /usr/local/bin/google-chrome /usr/bin/google-chrome \
    && chown -R node:node "$HOME"

USER node
