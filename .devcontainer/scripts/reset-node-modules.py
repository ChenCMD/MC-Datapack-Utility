"""Recreate generated dependencies without following links or deleting caches."""

from pathlib import Path
import re
import shutil


def reset(root, mountinfo=None):
    root = Path(root).absolute()
    if root.name != "node_modules" or not root.is_dir() or root.resolve() != root:
        raise ValueError(f"Refusing unsafe dependency root: {root}")
    if mountinfo is None:
        mountinfo = Path("/proc/self/mountinfo").read_text()
    # Reject nested mounts before deleting any entries; symlinks are unlinked.
    for line in mountinfo.splitlines():
        mounted = Path(re.sub(r"\\([0-7]{3})", lambda m: chr(int(m[1], 8)), line.split()[4]))
        if mounted != root and mounted.is_relative_to(root):
            raise ValueError(f"Refusing nested dependency mount: {mounted}")
    for entry in root.iterdir():
        if entry.name == ".pnpm-store":
            continue
        if entry.is_symlink() or not entry.is_dir():
            entry.unlink()
        else:
            shutil.rmtree(entry)


if __name__ == "__main__":
    reset(Path(__file__).resolve().parents[2] / "node_modules")
