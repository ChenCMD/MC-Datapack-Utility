#!/usr/bin/env bash
# Run as root in a disposable Linux container; all fixtures live under /tmp.
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run this test as root in a disposable container.' >&2; exit 2; }
helper=$(realpath "$(dirname "$0")/../scripts/repair-volume-ownership.sh")
fixture=$(mktemp -d /tmp/mcdu-ownership.XXXXXX)
mounted=false
cleanup() {
  if $mounted; then umount "$fixture/home/nested-mount"; fi
  rm -rf -- "$fixture"
}
trap cleanup EXIT
chmod 755 "$fixture"
mkdir -p "$fixture/home/.config/gh" "$fixture/home/.codex/sessions" "$fixture/work/node_modules/pkg" "$fixture/host/subdirectory"
printf 'synthetic settings\n' > "$fixture/home/.claude.json"
printf 'synthetic history\n' > "$fixture/home/.bash_history"
printf 'synthetic auth\n' > "$fixture/home/.config/gh/hosts.yml"
printf 'synthetic session\n' > "$fixture/home/.codex/sessions/session.jsonl"
printf 'synthetic dependency\n' > "$fixture/work/node_modules/pkg/index.js"
printf 'host sentinel\n' > "$fixture/host/private"
printf 'workspace sentinel\n' > "$fixture/work/source"
chmod 600 "$fixture/home/.claude.json" "$fixture/home/.bash_history" "$fixture/home/.config/gh/hosts.yml"
chmod 700 "$fixture/home/.codex/sessions"
chown -R 12345:12346 "$fixture/home" "$fixture/work/node_modules" "$fixture/host"
touch "$fixture/home/group-only"
chown 1000:12346 "$fixture/home/group-only"
ln -s "$fixture/host" "$fixture/home/host-link"
ln -s "$fixture/work" "$fixture/work/node_modules/workspace-link"
ln -s "$fixture/missing" "$fixture/home/dangling"
before=$(stat -c '%u:%g:%a' "$fixture/host/private" "$fixture/host" "$fixture/work/source")

# Exercise nested bind-mount exclusion when the disposable container permits it.
mkdir "$fixture/home/nested-mount"
if mount --bind "$fixture/host" "$fixture/home/nested-mount" 2>/dev/null; then
  mounted=true
else
  echo 'SKIP: nested bind mount (requires CAP_SYS_ADMIN)'
fi
bash "$helper" 1000 1000 "$fixture/home" "$fixture/work/node_modules"
[[ $(stat -c '%u:%g' "$fixture/home/group-only" "$fixture/home/.claude.json" "$fixture/work/node_modules/pkg") == $'1000:1000\n1000:1000\n1000:1000' ]]
[[ $(stat -c '%u:%g:%a' "$fixture/host/private" "$fixture/host" "$fixture/work/source") == "$before" ]]
[[ $(stat -c '%a' "$fixture/home/.claude.json" "$fixture/home/.bash_history") == $'600\n600' ]]
setpriv --reuid=1000 --regid=1000 --clear-groups bash -s -- "$fixture" <<'CHECK'
set -euo pipefail
fixture=$1
for file in home/.claude.json home/.bash_history home/.config/gh/hosts.yml home/.codex/sessions/session.jsonl work/node_modules/pkg/index.js; do
  cat "$fixture/$file" > /dev/null
  printf 'container update\n' >> "$fixture/$file"
done
touch "$fixture/home/.codex/sessions/new-session"
rm "$fixture/work/node_modules/pkg/index.js"
printf 'replacement\n' > "$fixture/work/node_modules/pkg/index.js"
CHECK
bash "$helper" 1000 1000 "$fixture/home" "$fixture/work/node_modules"
ln -s "$fixture/host" "$fixture/unsafe-root"
if bash "$helper" 1000 1000 "$fixture/unsafe-root" "$fixture/work/node_modules" 2>/dev/null; then
  echo 'FAIL: accepted symlink root' >&2; exit 1
fi
if bash "$helper" 1000 1000 "$fixture/unsafe-root/subdirectory" "$fixture/work/node_modules" 2>/dev/null; then
  echo 'FAIL: accepted symlink ancestor' >&2; exit 1
fi
[[ $(stat -c '%u:%g:%a' "$fixture/host/private" "$fixture/host" "$fixture/work/source") == "$before" ]]
echo 'PASS: private home files, dependency descendants, repeat repair, symlink and host isolation'
if $mounted; then echo 'PASS: nested bind mount isolation'; fi
