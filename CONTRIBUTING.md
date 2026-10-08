# Contribution

## I have bugs or ideas!

If you have a bug or feature idea for MC Datapack Utility, please [open an Issue](https://github.com/ChenCMD/MC-Datapack-Utility/issues/new) and share it with us!

Also, it would be very helpful if you could create one Issue with only one bug/idea in it, and in the case of bugs, with useful information to reproduce or fix!

## Localization

MC Datapack Utility supports multiple languages.
MCDU would be much better if you could translate this project into your language.

We are using the [SPGoding](https://github.com/SPGoding) website together for translation.

#### Steps
1. Go to the [localization website](https://l10n.spgoding.com/).
1. [Register](https://l10n.spgoding.com/accounts/register) by linking your GitHub account (recommended), or using your email.
  - Note that the username and email will be shown in the repository's git commit log. If you don't feel like you want to disclose your own email address, feel free to [contact SPGoding](https://github.com/SPGoding/datapack-language-server/wiki/Contact-SPGoding) to get an account with a fake email address.
1. See two components of MCDU [here](https://l10n.spgoding.com/projects/mc-datapack-utility).
1. Start translating!

#### Note
- If your language is not listed on the platform, simply contact [ChenCMD](https://github.com/ChenCMD/MC-Datapack-Utility/wiki/Contact);
- If you have suggestions for the source string (en-us), please [open an issue](https://github.com/ChenCMD/MC-Datapack-Utility/issues/new).


## Develop in a Dev Container

Install Docker with Compose, Node.js 18+ on the host, and the VS Code Dev Containers extension. Open this folder and run `Dev Containers: Reopen in Container`. Host initialization resolves Windows-native, WSL, macOS, and Linux home paths using Node.js; it does not require host Python, Bash, or agent installations. Windows/macOS behavior has not been verified on physical hosts.

The image includes Node.js 24, Yarn Classic, Claude Code, Codex CLI, GitHub CLI, Git, ripgrep, jq, Python, and Chromium. Creation runs `yarn install --frozen-lockfile` and `yarn compile`. The workspace is `/workspaces/MC-Datapack-Utility`, the container home is `/home/node`, and separate named volumes persist the home and `node_modules`.

### Import host AI settings

`.devcontainer/scripts/initialize.cjs` creates missing `~/.codex`, `~/.claude`, and `~/.agents` directories and generates `.devcontainer/compose.host.yaml` containing host paths, not credentials. This generated override is excluded from Git and Docker builds. Existing settings and instructions are left untouched.

Host agent directories are mounted read-only under `/mnt/host-settings/`. Python runs inside the container to copy them; the agents write to regular files in their persistent container home, so atomic replacement is supported.

| Data | Import behavior |
| --- | --- |
| Skills, instructions, supplemental files, rules, plugins | Refresh on creation / Rebuild |
| Configuration and credential files | Seed once, then retain container changes |
| Sessions, memories, history, databases, locks, runtime caches | Never import; retain container state |

`.devcontainer/config/agent-sync-policy.json` defines excluded configuration/runtime paths under `.codex`, `.claude`, and `.agents`. Other files are synchronized, including supplemental files referenced by instruction documents. Home-level `AGENTS.md` and `CLAUDE.md` are imported when present. Textual host-home references are translated to the container home. Symlinks within the imported directories are copied as regular files/directories; external symlinks are skipped. References outside these directories and host-only executables are not automatically imported.

After adding, editing, or deleting host skills, run `Dev Containers: Rebuild Container`. Only previously synchronized files are removed when deleted on the host. Existing container-owned filename collisions and destination symlinks are reported and skipped. Managed file/directory transitions are reconciled; untracked descendants are preserved. Host content takes precedence over edits to previously copied assets. Interrupted synchronization recovers from its update journal on the next Rebuild. During recovery from interrupted synchronization, temporary hard links and creation/deletion records distinguish copied files from identical-content container replacements. After synchronization completes, ownership is tracked by path: recreating a previously copied file does not make it container-owned, and a later host deletion also removes it. Manifests are saved by atomic replacement. Ordinary stop/start does not synchronize. Maintain the exclusion policy when an agent introduces new runtime paths.

The initial settings allowlist covers Codex `config.toml`, `*.config.toml`, `auth.json`, `hooks.json`, `notify.sh`; Claude `settings.json`, `settings.local.json`, `.credentials.json`, `.mcp.json`, and `~/.claude.json`. Existing volumes retain their settings, credentials, and sessions on upgrade. Seed completion is tracked per agent so a legacy Codex-only marker does not suppress initial Claude settings. A global-only legacy completion marker remains completion for both agents, preserving a container logout rather than reimporting removed credentials. Credentials stored only in an OS keychain require `claude auth login` / `codex login` inside the container. A host without any agent settings can also start.

The home volume retains Codex sessions/SQLite, Claude `projects/` and `sessions/`, authentication, GitHub CLI authentication, Bash history, and VS Code storage. Bash saves and merges history at each prompt. Ownership repair handles UID/GID changes throughout the home and dependency volumes without following host links or touching nested mounts. Deleting volumes, moving the checkout, or changing hosts starts a fresh state.

The current WSL Codex notification script requires `powershell.exe`; use `codex -c 'notify=[]'` to disable it in the container. `/usr/bin/google-chrome` launches Chromium without its own browser sandbox for Chrome DevTools MCP. Port 1455 is forwarded for Codex browser login.

Authenticate GitHub CLI once inside the container:

```bash
gh auth login --hostname github.com --git-protocol https --web --insecure-storage
gh auth setup-git
```

Its credential files persist under `~/.config/gh`.

### Debug the extension

Select `Run Extension (Sample Datapack)` in Run and Debug and press F5. It compiles the extension and opens a sample datapack in the Extension Development Host; `pack.mcmeta` triggers activation. Set TypeScript breakpoints in `src/` and try the sample `.mcfunction` or Datapack commands. The existing `Run Extension` configuration works with another datapack accessible in the container. Mounted `resource/` supplies Webview CSS/JavaScript. GitHub API/raw files and Mojang version information require external network access.

Use `yarn watch` for continuous builds. There is currently no suite at the path referenced by `Extension Tests`; use a `Run Extension` configuration. Test synchronization with `node --test .devcontainer/tests/initialize.test.cjs` and `python3 -m unittest discover -s .devcontainer/tests -p 'test_*.py'`; the Python tests can run inside the container. Run `.devcontainer/tests/test-volume-ownership.sh` as root in a disposable Linux container. Its nested bind-mount test requires `CAP_SYS_ADMIN`; the development container itself does not receive that capability.

References: [GitNexus host import design](https://github.com/abhigyanpatwari/GitNexus/blob/main/.devcontainer/README.md), [VS Code extension debugging](https://code.visualstudio.com/api/advanced-topics/remote-extensions#_debugging-in-a-custom-development-container), [Claude Dev Containers](https://code.claude.com/docs/en/devcontainer), [Codex credential storage](https://developers.openai.com/codex/auth/).
