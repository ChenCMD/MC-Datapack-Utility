"""Verify rebuild synchronization with disposable settings, not real tokens."""

import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import tomllib
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("sync", Path(__file__).resolve().parent.parent / "scripts" / "sync-agent-settings.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AgentSyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / "host"
        self.home = Path(self.temp.name) / "container"
        self.source.mkdir()
        self.home.mkdir()

    def write(self, root, relative, text):
        file = root / relative
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(text)
        return file

    def sync(self):
        module.sync(self.source, self.home, "/host-user")

    def test_rebuild_updates_assets_but_preserves_settings_auth_and_state(self):
        for relative in [".codex/config.toml", ".codex/auth.json", ".claude/settings.json", ".claude/.credentials.json", ".claude.json"]:
            self.write(self.source, relative, "host-original")
        for relative in [".codex/sessions/host.jsonl", ".codex/state_5.sqlite", ".codex/history.jsonl", ".codex/memories/a.md", ".claude/projects/host.jsonl", ".claude/sessions/host.jsonl", ".claude/debug/a.log", ".claude/plans/a.md"]:
            self.write(self.source, relative, "host-state")
        skill = self.write(self.source, ".claude/skills/example/SKILL.md", "old skill")
        self.write(self.source, ".codex/AGENTS.md", "Read references/conventions.md")
        self.write(self.source, ".codex/references/conventions.md", "supplemental instructions")
        removed = self.write(self.source, ".agents/skills/removed/SKILL.md", "removed skill")
        self.sync()
        self.assertFalse((self.home / ".claude/projects").exists())
        self.assertFalse((self.home / ".claude/sessions").exists())
        self.assertFalse((self.home / ".codex/state_5.sqlite").exists())
        self.assertFalse((self.home / ".codex/sessions").exists())
        self.assertEqual((self.home / ".codex/references/conventions.md").read_text(), "supplemental instructions")
        for relative in [".codex/config.toml", ".codex/auth.json", ".claude/settings.json", ".claude/.credentials.json", ".claude.json", ".codex/sessions/container.jsonl", ".codex/state_5.sqlite", ".claude/projects/container.jsonl"]:
            self.write(self.home, relative, "container-owned")
        self.write(self.home, ".claude/skills/container-only/SKILL.md", "untracked skill")
        self.write(self.source, ".codex/auth.json", "host-new-token")
        skill.write_text("updated skill")
        removed.unlink()
        self.sync()
        self.assertEqual((self.home / ".claude/skills/example/SKILL.md").read_text(), "updated skill")
        self.assertFalse((self.home / ".agents/skills/removed/SKILL.md").exists())
        self.assertEqual((self.home / ".claude/skills/container-only/SKILL.md").read_text(), "untracked skill")
        for relative in [".codex/config.toml", ".codex/auth.json", ".claude/settings.json", ".claude/.credentials.json", ".claude.json", ".codex/sessions/container.jsonl", ".codex/state_5.sqlite", ".claude/projects/container.jsonl"]:
            self.assertEqual((self.home / relative).read_text(), "container-owned")

    def test_empty_host_does_not_require_settings_or_authentication(self):
        self.sync()
        self.assertTrue((self.home / ".devcontainer/seeded-settings").exists())

    def test_host_identity_is_never_imported_into_a_new_home(self):
        self.write(self.source, ".codex/installation_id", "host-installation-id")
        self.sync()
        self.assertFalse((self.home / ".codex/installation_id").exists())

    def test_path_translation_and_internal_symlinks(self):
        self.write(self.source, ".codex/references/example.md", "Read /host-user/.claude/CLAUDE.md")
        self.write(self.source, ".claude/CLAUDE.md", "Host instructions")
        link = self.source / ".codex/AGENTS.md"
        link.symlink_to("/host-user/.codex/references/example.md")
        self.sync()
        self.assertEqual((self.home / ".codex/AGENTS.md").read_text(), f"Read {self.home}/.claude/CLAUDE.md")
        windows = b'{"path":"C:\\\\Users\\\\developer/.codex/skills"}'
        translated = module.translate_paths(windows, "C:\\Users\\developer", self.home)
        self.assertNotIn(b"C:", translated)

    def test_legacy_volume_is_not_reseeded(self):
        self.write(self.home, ".devcontainer/seeded-codex", "")
        self.write(self.home, ".codex/auth.json", "existing token")
        self.write(self.source, ".codex/auth.json", "host token")
        self.sync()
        self.assertEqual((self.home / ".codex/auth.json").read_text(), "existing token")

    def test_state_is_not_imported_through_an_asset_symlink(self):
        self.write(self.source, ".claude/projects/host.jsonl", "host session")
        self.write(self.source, ".codex/AGENTS.md", "instructions")
        (self.source / ".codex/session-alias.md").symlink_to("../.claude/projects/host.jsonl")
        self.sync()
        self.assertFalse((self.home / ".codex/session-alias.md").exists())

    def test_destination_session_symlink_is_never_written_or_deleted(self):
        source = self.write(self.source, ".codex/skills/a/SKILL.md", "HOST")
        self.sync()
        directory = self.home / ".codex/skills/a"
        session_directory = self.home / ".codex/sessions/a"
        session_directory.parent.mkdir()
        shutil.move(str(directory), session_directory)
        session = session_directory / "SKILL.md"
        session.write_text("SESSION")
        directory.symlink_to("../sessions/a", target_is_directory=True)
        self.sync()
        self.assertEqual(session.read_text(), "SESSION")
        source.unlink()
        self.sync()
        self.assertEqual(session.read_text(), "SESSION")

    def test_external_destination_and_seed_symlinks_are_preserved(self):
        outside = self.home.parent / "outside"
        outside.mkdir()
        sentinel = self.write(outside, "AGENTS.md", "PRIVATE")
        (self.home / "AGENTS.md").symlink_to(sentinel)
        self.write(self.source, "AGENTS.md", "HOST")
        (self.home / ".codex").symlink_to(outside, target_is_directory=True)
        self.write(self.source, ".codex/auth.json", "HOST TOKEN")
        self.sync()
        self.assertEqual(sentinel.read_text(), "PRIVATE")
        self.assertFalse((outside / "auth.json").exists())

    def test_untracked_container_collision_is_never_adopted(self):
        relative = ".claude/skills/custom/SKILL.md"
        local = self.write(self.home, relative, "CONTAINER")
        source = self.write(self.source, relative, "HOST")
        self.sync()
        self.assertEqual(local.read_text(), "CONTAINER")
        manifest = json.loads((self.home / ".devcontainer/synced-agent-assets.json").read_text())
        self.assertNotIn(relative, manifest)
        source.unlink()
        self.sync()
        self.assertEqual(local.read_text(), "CONTAINER")

    def test_all_source_copy_routes_reject_external_and_state_targets(self):
        outside = self.write(self.home.parent, "outside-secret", "OUTSIDE")
        self.write(self.source, ".codex/sessions/state.jsonl", "SESSION")
        for relative, target in [(".codex/auth.json", outside),
                                 (".claude/.credentials.json", outside),
                                 (".claude.json", outside),
                                 ("AGENTS.md", Path(".codex/sessions/state.jsonl")),
                                 ("CLAUDE.md", outside)]:
            link = self.source / relative
            link.parent.mkdir(parents=True, exist_ok=True)
            link.symlink_to(target)
        self.sync()
        for relative in [".codex/auth.json", ".claude/.credentials.json", ".claude.json", "AGENTS.md", "CLAUDE.md"]:
            self.assertFalse((self.home / relative).exists(), relative)

    def test_absolute_chained_and_cyclic_source_links(self):
        self.write(self.source, ".codex/references/actual.md", "instructions")
        (self.source / ".codex/alias.md").symlink_to("/host-user/.codex/references/actual.md")
        (self.source / ".codex/AGENTS.md").symlink_to("/host-user/.codex/alias.md")
        (self.source / ".codex/cycle.md").symlink_to("cycle.md")
        self.write(self.source, ".claude/stored-token", "TOKEN")
        (self.source / ".claude/.credentials.json").symlink_to("/host-user/.claude/stored-token")
        self.sync()
        self.assertEqual((self.home / ".codex/AGENTS.md").read_text(), "instructions")
        self.assertEqual((self.home / ".claude/.credentials.json").read_text(), "TOKEN")
        self.assertFalse((self.home / ".codex/cycle.md").exists())

    def test_windows_serialized_paths_and_home_boundaries(self):
        host = r"C:\Users\Some Developer"
        original = {"path": host + r"\.codex\My Skills\SKILL.md",
                    "other": host + r"-other\.codex\skills",
                    "token": host + r"\opaque"}
        actual = json.loads(module.translate_paths(json.dumps(original).encode(), host, self.home))
        self.assertEqual(actual["path"], str(self.home / ".codex/My Skills/SKILL.md"))
        self.assertEqual(actual["other"], original["other"])
        self.assertEqual(actual["token"], original["token"])
        value = host + r"\.claude\plugins\example"
        document = "path = " + json.dumps(value) + "\nliteral = '" + value + "'\n"
        toml = tomllib.loads(module.translate_paths(document.encode(), host, self.home, toml=True).decode())
        self.assertEqual(toml["path"], str(self.home / ".claude/plugins/example"))
        self.assertEqual(toml["literal"], toml["path"])
        reference = b"Read /host-user-other/private and /host-user/.codex/AGENTS.md"
        translated = module.translate_paths(reference, "/host-user", self.home).decode()
        self.assertIn("/host-user-other/private", translated)
        self.assertIn(str(self.home / ".codex/AGENTS.md"), translated)

    def test_shell_quotes_are_preserved_for_seeded_and_synchronized_scripts(self):
        script = ("printf '%s\\n' '/host-user/.codex/$NAME'\n"
                  'printf \'%s\\n\' "/host-user/.codex/$NAME"\n')
        paths = [".codex/notify.sh", ".codex/skills/example/check.sh"]
        for relative in paths:
            self.write(self.source, relative, script)
        self.sync()
        for relative in paths:
            with self.subTest(relative=relative):
                actual = (self.home / relative).read_text()
                self.assertEqual(actual, script.replace("/host-user", str(self.home)))
                result = subprocess.run(["/bin/bash", "--noprofile", "--norc"],
                                        input=actual, text=True, capture_output=True,
                                        env={"NAME": "expanded"}, check=True)
                self.assertEqual(result.stdout.splitlines(),
                                 [str(self.home / ".codex/$NAME"),
                                  str(self.home / ".codex/expanded")])

    def test_seeded_and_synchronized_toml_decode_windows_paths(self):
        host = r"C:\Users\Developer"
        document = "path = " + json.dumps(host + r"\.codex\My Skills") + "\n"
        paths = [".codex/config.toml", ".codex/references/example.toml"]
        for relative in paths:
            self.write(self.source, relative, document)
        module.sync(self.source, self.home, host)
        for relative in paths:
            with self.subTest(relative=relative):
                actual = tomllib.loads((self.home / relative).read_text())
                self.assertEqual(actual["path"], str(self.home / ".codex/My Skills"))

    def test_legacy_markers_seed_claude_independently(self):
        self.write(self.home, ".devcontainer/seeded-codex", "")
        self.write(self.home, ".devcontainer/seeded-settings", "")
        self.write(self.home, ".codex/auth.json", "CONTAINER TOKEN")
        self.write(self.source, ".codex/auth.json", "HOST TOKEN")
        self.write(self.source, ".claude/settings.json", '{"theme":"dark"}')
        self.write(self.source, ".claude/.credentials.json", "CLAUDE TOKEN")
        self.sync()
        self.assertEqual((self.home / ".codex/auth.json").read_text(), "CONTAINER TOKEN")
        self.assertEqual((self.home / ".claude/.credentials.json").read_text(), "CLAUDE TOKEN")
        (self.home / ".claude/settings.json").write_text("container settings")
        self.write(self.source, ".claude/settings.json", "changed host settings")
        self.sync()
        self.assertEqual((self.home / ".claude/settings.json").read_text(), "container settings")

    def test_manifest_owned_file_directory_transitions(self):
        source = self.write(self.source, ".codex/auxiliary", "FILE")
        self.sync()
        source.unlink()
        self.write(self.source, ".codex/auxiliary/conventions.md", "DIRECTORY")
        self.sync()
        self.assertEqual((self.home / ".codex/auxiliary/conventions.md").read_text(), "DIRECTORY")
        shutil.rmtree(source)
        source.write_text("FILE AGAIN")
        self.sync()
        self.assertEqual((self.home / ".codex/auxiliary").read_text(), "FILE AGAIN")

    def test_directory_transition_preserves_untracked_descendants(self):
        source = self.write(self.source, ".codex/auxiliary/managed.md", "MANAGED")
        self.sync()
        local = self.write(self.home, ".codex/auxiliary/local.md", "LOCAL")
        source.unlink()
        source.parent.rmdir()
        source.parent.write_text("NEW FILE")
        self.sync()
        self.assertEqual(local.read_text(), "LOCAL")
        self.assertEqual((self.home / ".codex/auxiliary/managed.md").read_text(), "MANAGED")

    def test_partial_copy_failure_recovers_owned_assets_for_deletion(self):
        first = self.write(self.source, ".codex/a.md", "FIRST")
        self.write(self.source, ".codex/b.md", "SECOND")
        original = module.copy_file
        def fail_second(source, *args, **kwargs):
            if source.name == "b.md":
                raise OSError("induced copy failure")
            return original(source, *args, **kwargs)
        with patch.object(module, "copy_file", side_effect=fail_second):
            with self.assertRaises(OSError):
                self.sync()
        self.assertEqual((self.home / ".codex/a.md").read_text(), "FIRST")
        self.assertEqual(json.loads((self.home / ".devcontainer/synced-agent-assets.json").read_text()), [])
        first.unlink()
        self.sync()
        self.assertFalse((self.home / ".codex/a.md").exists())
        self.assertEqual((self.home / ".codex/b.md").read_text(), "SECOND")

    def test_failed_intent_does_not_adopt_a_container_file(self):
        source = self.write(self.source, ".codex/a.md", "HOST")
        with patch.object(module, "copy_file", side_effect=OSError("before copy")):
            with self.assertRaises(OSError):
                self.sync()
        local = self.write(self.home, ".codex/a.md", "CONTAINER")
        source.unlink()
        self.sync()
        self.assertEqual(local.read_text(), "CONTAINER")

    def test_final_manifest_failure_is_atomic_and_recoverable(self):
        source = self.write(self.source, ".codex/a.md", "HOST")
        original = module.os.replace
        calls = 0
        def fail_final_manifest(src, dst):
            nonlocal calls
            if Path(dst).name == "synced-agent-assets.json":
                calls += 1
                if calls == 2:
                    raise OSError("induced manifest failure")
            return original(src, dst)
        with patch.object(module.os, "replace", side_effect=fail_final_manifest):
            with self.assertRaises(OSError):
                self.sync()
        self.assertEqual(json.loads((self.home / ".devcontainer/synced-agent-assets.json").read_text()), [])
        journal = self.home / ".devcontainer/agent-sync-journal.jsonl"
        with journal.open("a") as pending:
            pending.write('{"path":')
        source.unlink()
        self.sync()
        self.assertFalse((self.home / ".codex/a.md").exists())

    def test_failed_staged_copy_does_not_adopt_identical_local_content(self):
        source = self.write(self.source, ".codex/a.md", "IDENTICAL")
        original = module.os.replace
        def fail_asset(src, dst):
            if Path(dst) == self.home / ".codex/a.md":
                raise OSError("after intent, before rename")
            return original(src, dst)
        with patch.object(module.os, "replace", side_effect=fail_asset):
            with self.assertRaises(OSError):
                self.sync()
        local = self.write(self.home, ".codex/a.md", "IDENTICAL")
        source.unlink()
        self.sync()
        self.assertEqual(local.read_text(), "IDENTICAL")
        self.assertNotIn(".codex/a.md", json.loads((self.home / ".devcontainer/synced-agent-assets.json").read_text()))

    def test_cleanup_failure_does_not_delete_a_replacement_container_file(self):
        source = self.write(self.source, ".codex/a.md", "MANAGED")
        self.sync()
        source.unlink()
        original = module.os.replace
        calls = 0
        def fail_final(src, dst):
            nonlocal calls
            if Path(dst).name == "synced-agent-assets.json":
                calls += 1
                if calls == 2:
                    raise OSError("after deletion, before final manifest")
            return original(src, dst)
        with patch.object(module.os, "replace", side_effect=fail_final):
            with self.assertRaises(OSError):
                self.sync()
        local = self.write(self.home, ".codex/a.md", "CONTAINER REPLACEMENT")
        self.sync()
        self.assertEqual(local.read_text(), "CONTAINER REPLACEMENT")

    def test_failed_shape_transition_does_not_reclaim_removed_descendants(self):
        source = self.write(self.source, ".codex/auxiliary/managed.md", "MANAGED")
        self.sync()
        source.unlink()
        source.parent.rmdir()
        source.parent.write_text("HOST FILE")
        with patch.object(module, "copy_file", side_effect=OSError("after structural cleanup")):
            with self.assertRaises(OSError):
                self.sync()
        local = self.write(self.home, ".codex/auxiliary/managed.md", "NEW CONTAINER FILE")
        self.sync()
        self.assertEqual(local.read_text(), "NEW CONTAINER FILE")

    def test_host_agent_directory_deletion_removes_managed_assets_only(self):
        self.write(self.source, ".agents/skills/a/SKILL.md", "HOST")
        self.sync()
        local = self.write(self.home, ".agents/skills/local/SKILL.md", "LOCAL")
        shutil.rmtree(self.source / ".agents")
        self.sync()
        self.assertFalse((self.home / ".agents/skills/a/SKILL.md").exists())
        self.assertEqual(local.read_text(), "LOCAL")

    def test_global_only_legacy_marker_does_not_reverse_logout(self):
        self.write(self.home, ".devcontainer/seeded-settings", "")
        self.write(self.source, ".codex/auth.json", "HOST TOKEN")
        self.write(self.source, ".claude/.credentials.json", "HOST TOKEN")
        self.sync()
        self.assertFalse((self.home / ".codex/auth.json").exists())
        self.assertFalse((self.home / ".claude/.credentials.json").exists())
        self.assertTrue((self.home / ".devcontainer/seeded-codex").exists())
        self.assertTrue((self.home / ".devcontainer/seeded-claude").exists())

    def test_interrupted_global_migration_never_reimports_credentials(self):
        self.write(self.home, ".devcontainer/seeded-settings", "")
        self.write(self.source, ".codex/auth.json", "HOST TOKEN")
        self.write(self.source, ".claude/.credentials.json", "HOST TOKEN")
        original = module.atomic_write
        def fail_claude(destination, *args, **kwargs):
            if destination.name == "seeded-claude":
                raise OSError("interrupted marker migration")
            return original(destination, *args, **kwargs)
        with patch.object(module, "atomic_write", side_effect=fail_claude):
            with self.assertRaises(OSError):
                self.sync()
        self.assertTrue((self.home / ".devcontainer/seeded-codex").exists())
        self.assertTrue((self.home / ".devcontainer/migrating-global-seed").exists())
        self.sync()
        self.assertFalse((self.home / ".codex/auth.json").exists())
        self.assertFalse((self.home / ".claude/.credentials.json").exists())
        self.assertTrue((self.home / ".devcontainer/seeded-claude").exists())
        self.assertFalse((self.home / ".devcontainer/migrating-global-seed").exists())

    def test_toml_multiline_windows_paths_are_decoded_and_normalized(self):
        host = r"C:\Users\Developer"
        value = host + r"\.codex\My Skills"
        basic = 'path = """\n' + json.dumps(value)[1:-1] + '"""\n'
        literal = "path = '''\n" + value + "'''\n"
        for document in [basic, literal]:
            with self.subTest(document=document):
                translated = module.translate_paths(document.encode(), host, self.home, toml=True)
                self.assertEqual(tomllib.loads(translated.decode())["path"], str(self.home / ".codex/My Skills"))

    def test_unavailable_source_does_not_remove_existing_assets(self):
        self.write(self.source, ".codex/a.md", "MANAGED")
        self.sync()
        shutil.rmtree(self.source)
        with self.assertRaises(ValueError):
            self.sync()
        self.assertEqual((self.home / ".codex/a.md").read_text(), "MANAGED")

    def test_shape_transition_preserves_container_created_empty_directory(self):
        source = self.write(self.source, ".codex/auxiliary/managed.md", "MANAGED")
        self.sync()
        local = self.home / ".codex/auxiliary/local-directory"
        local.mkdir()
        source.unlink()
        source.parent.rmdir()
        source.parent.write_text("HOST FILE")
        self.sync()
        self.assertTrue(local.is_dir())
        self.assertTrue((self.home / ".codex/auxiliary/managed.md").is_file())


if __name__ == "__main__":
    unittest.main()
