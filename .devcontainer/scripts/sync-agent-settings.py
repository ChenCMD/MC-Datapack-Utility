"""Refresh host-authored assets without overwriting container-owned state."""

import argparse
import fnmatch
import json
import os
from pathlib import Path, PureWindowsPath
import re
import stat
import tempfile
import tomllib
import uuid


POLICY = json.loads((Path(__file__).resolve().parent.parent / "config" / "agent-sync-policy.json").read_text())
GROUPS = {".codex", ".claude", ".agents"}
INSTRUCTIONS = {"AGENTS.md", "CLAUDE.md"}


def protected(group, relative, include_settings=True):
    parts = relative.parts
    if not parts:
        return False
    rule = POLICY.get(group, {})
    if parts[0] in rule.get("stateDirectories", []):
        return True
    if any(relative.as_posix() == p or relative.as_posix().startswith(p + "/")
           for p in rule.get("localPaths", [])):
        return True
    patterns = rule.get("stateFiles", [])
    if include_settings:
        patterns = patterns + rule.get("initialFiles", [])
    if len(parts) == 1 and any(fnmatch.fnmatch(parts[0], p) for p in patterns):
        return True
    return any(fnmatch.fnmatch(parts[-1], p) for p in POLICY["statePatterns"])


def asset_path(relative):
    if relative.is_absolute() or ".." in relative.parts or not relative.parts:
        return False
    if relative.as_posix() in INSTRUCTIONS:
        return True
    return (len(relative.parts) > 1 and relative.parts[0] in GROUPS
            and not protected(relative.parts[0][1:], Path(*relative.parts[1:])))


def safe_destination(home, relative):
    """Check every component before mutations; never follow destination links."""
    if relative.is_absolute() or ".." in relative.parts or not relative.parts:
        raise ValueError(f"Invalid destination: {relative}")
    destination = home
    for part in relative.parts:
        destination /= part
        if destination.is_symlink():
            raise ValueError(f"Destination contains a symlink: {relative}")
    return destination


def host_relative(target, host_home):
    if not host_home:
        return None
    if PureWindowsPath(host_home).is_absolute():
        try:
            return Path(*PureWindowsPath(target).relative_to(PureWindowsPath(host_home)).parts)
        except ValueError:
            return None
    try:
        return Path(target).relative_to(Path(host_home))
    except ValueError:
        return None


def resolve_source(source, source_home, host_home, include_settings=True):
    """Resolve each link independently, including absolute host-path chains."""
    root = source_home.resolve()
    try:
        candidate = root / source.absolute().relative_to(source_home.absolute())
    except ValueError:
        return None
    seen = set()
    for _ in range(64):
        candidate = Path(os.path.abspath(candidate))
        if not candidate.is_relative_to(root):
            return None
        relative = candidate.relative_to(root)
        cursor = root
        for index, component in enumerate(relative.parts):
            cursor /= component
            if not cursor.is_symlink():
                continue
            if cursor in seen:
                return None
            seen.add(cursor)
            target = os.readlink(cursor)
            mapped = host_relative(target, host_home)
            if mapped is not None:
                replacement = root / mapped
            elif Path(target).is_absolute():
                replacement = Path(target)
            elif PureWindowsPath(target).is_absolute():
                return None
            else:
                replacement = cursor.parent / target
            candidate = replacement.joinpath(*relative.parts[index + 1:])
            break
        else:
            if len(relative.parts) > 1 and relative.parts[0] in GROUPS:
                if protected(relative.parts[0][1:], Path(*relative.parts[1:]), include_settings):
                    return None
            elif relative.as_posix() == ".claude.json" and include_settings:
                return None
            return candidate if candidate.exists() else None
    return None


def translate_value(value, host_home, home):
    if not host_home:
        return value
    windows = PureWindowsPath(host_home).is_absolute()
    variants = {host_home.rstrip("/\\"), host_home.replace("\\", "/").rstrip("/")}
    flags = re.IGNORECASE if windows else 0
    for prefix in sorted(variants, key=len, reverse=True):
        # Complete paths can contain spaces. Require a component boundary so
        # /Users/dev-other is never mistaken for /Users/dev.
        match = re.match(re.escape(prefix) + r"(?=$|[/\\])", value, flags) if "\n" not in value and "\r" not in value else None
        if match:
            suffix = value[match.end():]
            return str(home) + (suffix.replace("\\", "/") if windows else suffix)
    for prefix in sorted(variants, key=len, reverse=True):
        pattern = re.compile(r"(?<![\w/\\])" + re.escape(prefix)
                             + r"(?=$|[/\\])(?:[/\\][^\s\"'`<>\]),;]*)?", flags)
        def replace(match):
            suffix = match.group()[len(prefix):]
            return str(home) + (suffix.replace("\\", "/") if windows else suffix)
        value = pattern.sub(replace, value)
    return value


def translate_paths(data, host_home, home, *, toml=False):
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return data
    if not host_home or "\x00" in text:
        return data
    def walk(value):
        if isinstance(value, str):
            return translate_value(value, host_home, home)
        if isinstance(value, list):
            return [walk(item) for item in value]
        if isinstance(value, dict):
            return {translate_value(key, host_home, home):
                    (item if re.search(r"token|secret|password|credential|api.?key|authorization", key, re.I)
                     or key.lower() in {"env", "headers"} else walk(item))
                    for key, item in value.items()}
        return value
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        if not toml:
            # Scripts and prose retain their quoting and escape semantics.
            return translate_value(text, host_home, home).encode("utf-8")
        # Parse TOML's actual string syntax, including multiline strings and
        # line continuations, rather than interpreting quoted fragments as JSON.
        def quoted(match):
            token = match.group()
            try:
                value = tomllib.loads("value = " + token)["value"]
            except tomllib.TOMLDecodeError:
                return translate_value(token, host_home, home)
            translated = translate_value(value, host_home, home)
            if translated == value:
                return token
            return json.dumps(translated, ensure_ascii=False)
        text = re.sub(r'"""(?:\\.|[^\\])*?"""|\'\'\'.*?\'\'\'|"(?:\\.|[^"\\])*"|\'[^\'\n]*\'', quoted, text, flags=re.DOTALL)
        return translate_value(text, host_home, home).encode("utf-8")
    else:
        translated = walk(parsed)
        return data if translated == parsed else (json.dumps(translated, ensure_ascii=False, indent=2) + "\n").encode()


def atomic_write(destination, data, mode=0o600, before_replace=None):
    descriptor, name = tempfile.mkstemp(prefix=".mcdu-sync-", dir=destination.parent)
    try:
        with os.fdopen(descriptor, "wb") as target:
            target.write(data)
            target.flush()
            os.fsync(target.fileno())
        os.chmod(name, mode)
        if before_replace is not None:
            before_replace(Path(name))
        os.replace(name, destination)
        directory = os.open(destination.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        Path(name).unlink(missing_ok=True)


def copy_file(source, destination, host_home, home, private=False, data=None, before_replace=None):
    safe_destination(home, destination.relative_to(home))
    destination.parent.mkdir(parents=True, exist_ok=True)
    if data is None:
        data = source.read_bytes()
        if not private:
            data = translate_paths(data, host_home, home, toml=destination.suffix == ".toml")
    mode = 0o600 if private else stat.S_IMODE(source.stat().st_mode) | stat.S_IWUSR
    atomic_write(destination, data, mode, before_replace)


class Journal:
    """Pin file identities until the manifest commits; contents are not proof."""

    def __init__(self, home, path):
        self.home, self.path = home, path
        self.staging = safe_destination(home, Path(".devcontainer/agent-sync-staging"))
        self.staging.mkdir(exist_ok=True, mode=0o700)

    def anchor(self, file):
        name = uuid.uuid4().hex
        os.link(file, self.staging / name, follow_symlinks=False)
        # A hard link keeps the inode allocated, preventing identity reuse even
        # if the target is deleted and an identical-content file is created.
        directory = os.open(self.staging, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
        return name

    def append(self, record):
        with self.path.open("a") as stream:
            stream.write(json.dumps(record) + "\n")
            stream.flush()
            os.fsync(stream.fileno())

    def release(self, name, destination, owned, delete=False):
        anchor = self.anchor(destination) if destination.is_file() else None
        self.append({"op": "release", "path": name, "anchor": anchor})
        if delete:
            destination.unlink()
        owned.discard(name)

    def forget(self, name, owned):
        self.append({"op": "release", "path": name, "anchor": None})
        owned.discard(name)

    def copied(self, name, staged):
        self.append({"op": "copy", "path": name, "anchor": self.anchor(staged)})

    def recover(self, owned):
        if not self.path.exists():
            return
        for line in self.path.read_text().splitlines():
            try:
                record = json.loads(line)
                relative = Path(record["path"])
                if not asset_path(relative):
                    continue
                name = relative.as_posix()
                destination = safe_destination(self.home, relative)
                anchor_name = record.get("anchor")
                matches = False
                if isinstance(anchor_name, str) and re.fullmatch(r"[0-9a-f]{32}", anchor_name):
                    anchor = safe_destination(self.home, Path(".devcontainer/agent-sync-staging") / anchor_name)
                    matches = destination.is_file() and anchor.is_file() and os.path.samefile(destination, anchor)
                if record.get("op") == "release":
                    # Keep ownership only if the original file still exists:
                    # the attempted deletion/replacement did not take place.
                    if not matches:
                        owned.discard(name)
                elif record.get("op") == "copy" and matches:
                    owned.add(name)
            except (ValueError, KeyError, TypeError):
                # An incomplete final intent was never followed by a mutation.
                continue

    def clean_anchors(self):
        for file in self.staging.iterdir():
            if re.fullmatch(r"[0-9a-f]{32}", file.name) and (file.is_file() or file.is_symlink()):
                file.unlink()


def assets(source, source_home, host_home, group, relative=Path("."), parents=frozenset(), blocked=None):
    resolved = resolve_source(source, source_home, host_home)
    if resolved is None or resolved in parents:
        if blocked is not None:
            blocked.add((Path(f".{group}") / relative).as_posix())
        print(f"Skipping unavailable, protected or cyclic source: {source}")
        return
    if resolved.is_file():
        yield relative, resolved
    elif resolved.is_dir():
        for child in sorted(resolved.iterdir()):
            child_relative = relative / child.name
            if not protected(group, child_relative):
                yield from assets(child, source_home, host_home, group, child_relative,
                                  parents | {resolved}, blocked)


def prepare_destination(home, relative, owned, journal):
    destination = safe_destination(home, relative)
    # A host file can turn into a directory. Only remove a blocking parent
    # when that parent file was previously managed by this synchronizer.
    for parent in reversed(destination.parents):
        if parent == home or not parent.is_relative_to(home):
            continue
        name = parent.relative_to(home).as_posix()
        if parent.exists() and not parent.is_dir():
            if name not in owned or not parent.is_file():
                raise ValueError(f"Container-owned parent conflicts with asset: {relative}")
            journal.release(name, parent, owned, delete=True)
    if destination.is_dir():
        children = list(destination.rglob("*"))
        # Preflight the whole tree before deleting anything. Untracked files,
        # protected paths and symlinks make the transition a preserved conflict.
        files = []
        for child in children:
            name = child.relative_to(home)
            safe_destination(home, name)
            if not asset_path(name):
                raise ValueError(f"Protected descendant conflicts with asset: {relative}")
            if child.is_dir() and not any(key.startswith(name.as_posix() + "/") for key in owned):
                raise ValueError(f"Container-owned directory conflicts with asset: {relative}")
            if not child.is_dir():
                if not child.is_file() or name.as_posix() not in owned:
                    raise ValueError(f"Container-owned descendant conflicts with asset: {relative}")
                files.append(child)
        if not files and relative.as_posix() not in owned:
            raise ValueError(f"Container-owned directory conflicts with asset: {relative}")
        for child in files:
            journal.release(child.relative_to(home).as_posix(), child, owned, delete=True)
        for child in sorted((p for p in children if p.is_dir()), key=lambda p: len(p.parts), reverse=True):
            child.rmdir()
        destination.rmdir()
    elif destination.exists() and relative.as_posix() not in owned:
        raise ValueError(f"Container-owned file conflicts with asset: {relative}")
    return destination


def sync(source_home, home, host_home=""):
    source_home, home = Path(source_home).absolute(), Path(home).resolve()
    home.mkdir(parents=True, exist_ok=True)
    control = safe_destination(home, Path(".devcontainer"))
    control.mkdir(parents=True, exist_ok=True)
    if not source_home.is_dir():
        raise ValueError("Host settings source is unavailable")
    # An old global-only completion marker means both agents were seeded,
    # including when their credential files were deliberately removed later.
    per_agent_markers = [safe_destination(home, Path(f".devcontainer/seeded-{group}"))
                         for group in ["codex", "claude"]]
    migration = safe_destination(home, Path(".devcontainer/migrating-global-seed"))
    legacy_global = (migration.exists()
                     or (safe_destination(home, Path(".devcontainer/seeded-settings")).exists()
                         and not any(marker.exists() for marker in per_agent_markers)))
    if legacy_global and not migration.exists():
        # Persist the global completion decision before writing either marker.
        # Otherwise an interrupted migration looks like a Codex-only legacy home.
        atomic_write(migration, b"")
    # Completion is per agent. A legacy Codex marker must not suppress Claude.
    for group in ["codex", "claude"]:
        marker = safe_destination(home, Path(f".devcontainer/seeded-{group}"))
        if marker.exists():
            continue
        if legacy_global:
            atomic_write(marker, b"")
            continue
        root = source_home / f".{group}"
        candidates = [(source, Path(f".{group}") / source.name)
                      for pattern in POLICY[group]["initialFiles"] for source in sorted(root.glob(pattern))]
        if group == "claude":
            candidates.append((source_home / ".claude.json", Path(".claude.json")))
        for source, relative in candidates:
            resolved = resolve_source(source, source_home, host_home, include_settings=False)
            if resolved is None or not resolved.is_file():
                continue
            try:
                destination = safe_destination(home, relative)
            except ValueError as error:
                print(f"Skipping initial settings: {error}")
                continue
            if not destination.exists():
                copy_file(resolved, destination, host_home, home,
                          private=relative.name in {"auth.json", ".credentials.json"})
                if relative.name == ".claude.json":
                    destination.chmod(0o600)
        atomic_write(marker, b"")
    if migration.exists():
        migration.unlink()
    atomic_write(safe_destination(home, Path(".devcontainer/seeded-settings")), b"")

    manifest = safe_destination(home, Path(".devcontainer/synced-agent-assets.json"))
    journal_path = safe_destination(home, Path(".devcontainer/agent-sync-journal.jsonl"))
    journal = Journal(home, journal_path)
    owned = set(json.loads(manifest.read_text())) if manifest.exists() else set()
    if any(not isinstance(name, str) or not asset_path(Path(name)) for name in owned):
        # Old policies may have included paths that are now state. Drop their
        # ownership, preserving the files. Traversal entries are always invalid.
        if any(not isinstance(name, str) or Path(name).is_absolute() or ".." in Path(name).parts for name in owned):
            raise ValueError("Invalid asset manifest path")
        owned = {name for name in owned if asset_path(Path(name))}
    journal.recover(owned)
    # Commit recovered ownership before resetting the journal. If recovery
    # itself is interrupted, either the old journal or the new manifest remains.
    atomic_write(manifest, (json.dumps(sorted(owned)) + "\n").encode())
    atomic_write(journal_path, b"")
    journal.clean_anchors()

    blocked, sources = set(), {}
    for group in ["codex", "claude", "agents"]:
        root = source_home / f".{group}"
        if root.exists():
            for relative, source in assets(root, source_home, host_home, group, blocked=blocked):
                sources[(Path(f".{group}") / relative).as_posix()] = source
    for name in INSTRUCTIONS:
        source = source_home / name
        if os.path.lexists(source):
            resolved = resolve_source(source, source_home, host_home)
            if resolved is not None and resolved.is_file():
                sources[name] = resolved
            else:
                blocked.add(name)
                print(f"Skipping unavailable or protected instruction: {source}")
    for name, source in sorted(sources.items()):
        relative = Path(name)
        try:
            destination = prepare_destination(home, relative, owned, journal)
        except ValueError as error:
            print(f"Preserving conflict: {error}")
            blocked.add(name)
            try:
                safe_destination(home, relative)
            except ValueError:
                journal.forget(name, owned)
            continue
        data = translate_paths(source.read_bytes(), host_home, home, toml=relative.suffix == ".toml")
        expected_mode = stat.S_IMODE(source.stat().st_mode) | stat.S_IWUSR
        if (destination.is_file() and name in owned and destination.read_bytes() == data
                and stat.S_IMODE(destination.stat().st_mode) == expected_mode):
            continue
        if destination.is_file() and name in owned:
            journal.release(name, destination, owned)
        copy_file(source, destination, host_home, home, data=data,
                  before_replace=lambda staged, name=name: journal.copied(name, staged))
        owned.add(name)

    for name in list(owned - sources.keys()):
        if any(name == prefix or name.startswith(prefix + "/") for prefix in blocked):
            continue
        try:
            destination = safe_destination(home, Path(name))
        except ValueError as error:
            print(f"Preserving conflict: {error}")
            journal.forget(name, owned)
            continue
        if destination.is_file():
            journal.release(name, destination, owned, delete=True)
        else:
            journal.forget(name, owned)
    atomic_write(manifest, (json.dumps(sorted(owned), indent=2) + "\n").encode())
    journal_path.unlink()
    journal.clean_anchors()
    print(f"Synchronized {len(sources)} asset candidates; container settings and state preserved")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-home", default="/mnt/host-settings")
    parser.add_argument("--container-home", default=str(Path.home()))
    parser.add_argument("--host-home", default=os.environ.get("MCDU_HOST_HOME", ""))
    args = parser.parse_args()
    sync(args.source_home, args.container_home, args.host_home)
