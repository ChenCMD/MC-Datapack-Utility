#!/usr/bin/env bash
set -euo pipefail

if [[ $# != 4 || ! $1 =~ ^[0-9]+$ || ! $2 =~ ^[0-9]+$ ]]; then
  echo 'Usage: repair-volume-ownership.sh UID GID HOME_VOLUME NODE_MODULES_VOLUME' >&2
  exit 2
fi
uid=$1 gid=$2
shift 2

for root in "$@"; do
  # Reject symlink roots (including symlink ancestors) before any mutation.
  if [[ ! -d $root || $(realpath -e -- "$root") != "$(realpath -s -- "$root")" || $(realpath -e -- "$root") == / ]]; then
    echo "Refusing unsafe volume root: $root" >&2
    exit 2
  fi
done

for root in "$@"; do
  root=$(realpath -e -- "$root")
  prune=()
  # Bind mounts can share a device with their parent, so -xdev alone is not
  # sufficient. Prune every nested mount, including its mountpoint itself.
  while read -r _ _ _ _ mounted _; do
    printf -v mounted '%b' "$mounted"
    if [[ $mounted == "$root/"* ]]; then
      pattern=${mounted//\\/\\\\}
      pattern=${pattern//\*/\\*}
      pattern=${pattern//\?/\\?}
      pattern=${pattern//\[/\\[}
      if (( ${#prune[@]} )); then prune+=(-o); fi
      prune+=(-path "$pattern")
    fi
  done < /proc/self/mountinfo
  expression=()
  if (( ${#prune[@]} )); then expression+=( '(' "${prune[@]}" ')' -prune -o ); fi
  # Batch changes and skip already-correct ownership. -P and chown -h never
  # follow asset symlinks into the workspace or read-only host sources.
  find -P "$root" -xdev "${expression[@]}" \( ! -uid "$uid" -o ! -gid "$gid" \) \
    -exec chown -h -- "$uid:$gid" {} +
done
