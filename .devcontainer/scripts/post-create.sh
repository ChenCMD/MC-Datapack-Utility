#!/usr/bin/env bash
set -euo pipefail

# Repair only the persistent volumes, including private files from older UIDs.
sudo bash .devcontainer/scripts/repair-volume-ownership.sh "$(id -u)" "$(id -g)" "$HOME" "$PWD/node_modules"
umask 077
mkdir -p "$HOME/.codex" "$HOME/.claude" "$HOME/.agents" "$HOME/.config/gh" "$HOME/.devcontainer"
# Preserve old absolute WSL/macOS home references when upgrading an existing
# volume, without replacing any existing directory.
case "${MCDU_HOST_HOME:-}" in
  /home/*|/Users/*)
    if [[ "$MCDU_HOST_HOME" != "$HOME" && ! -e "$MCDU_HOST_HOME" && ! -L "$MCDU_HOST_HOME" ]]; then
      sudo mkdir -p "$(dirname "$MCDU_HOST_HOME")"
      sudo ln -s "$HOME" "$MCDU_HOST_HOME"
    fi
    ;;
esac
python3 .devcontainer/scripts/sync-agent-settings.py

# Append immediately and merge history from other terminals at every prompt.
if ! grep -q '# mcdu persistent history' "$HOME/.bashrc"; then
  cat >> "$HOME/.bashrc" <<'BASHRC'

# mcdu persistent history
export HISTFILE="$HOME/.bash_history"
export HISTSIZE=100000
export HISTFILESIZE=200000
shopt -s histappend
PROMPT_COMMAND="history -a; history -n; ${PROMPT_COMMAND:-:}"
BASHRC
fi

# A reused Yarn volume may contain undeclared optional dependencies. Recreate
# generated modules while retaining the volume and pnpm's downloaded packages.
python3 .devcontainer/scripts/reset-node-modules.py
pnpm install --frozen-lockfile
pnpm compile
