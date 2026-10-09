# Development instructions

## Scope and entry points

Read `docs/development.md` before changing behavior. It maps features, verification, known defects, and the next refactoring steps. This is a VS Code desktop extension; build Node 24 and extension-host Node 16 are different compatibility requirements. Preserve VS Code 1.75 compatibility unless a change explicitly raises the minimum version.

- `src/extension.ts`: activation, configuration changes, command registration.
- `src/commands/*/main.ts`: VS Code interaction and command orchestration.
- `src/commands/scoreOperation/core/`: host-independent parser/converter with injected effects.
- `src/commands/scoreOperation/utils/`: existing adapter API wired to VS Code, localization, and logging.
- `src/languages/`: formatting provider.
- `tests/fixtures/`: checked-in examples and expected baseline behavior.

## Making changes

1. Identify the affected feature and observable behavior. Add a failing behavioral test for fixes/new functionality, or preserve current output with a characterization test before refactoring.
2. Keep file operations, editor changes, dialogs, clipboard, network calls, and logging at adapters. Core modules must load without VS Code or `extension.ts`; import specific helper files instead of utility barrels.
3. Separate behavior fixes from structural changes. Some fixtures deliberately reproduce defects: do not update expected output just to make a test pass. Explain intentional fixes and update the known-issues list together with tests.
4. Keep changes small enough to review. Extend an existing seam before introducing a framework or repository-wide rewrite.
5. Update feature/development documentation when behavior, boundaries, verification commands, or compatibility changes. Update all applicable locale files and package localization files for new UI messages.

## Verification

- `pnpm install --frozen-lockfile` verifies reproducible installation.
- `pnpm check` runs type checking, lint, Node regression tests, and Dev Container tests.
- `pnpm test:integration` builds production output and runs real VS Code tests. On headless Linux use `xvfb-run -a pnpm test:integration`. Set `VSCODE_TEST_VERSION=1.75.0` to check the declared minimum; default is current stable.
- `pnpm package --out /tmp/mc-datapack-utility.vsix` checks packaging.
- Report what actually ran, failures, and unverified behavior. Tests here do not execute Minecraft, establish safety of dependency source code, or cover every command.

Keep pnpm pinned, retain the seven-day dependency age gate and version-specific install-script approvals, and keep the lockfile as one project document. Do not disable policies to add a dependency. Commit package manifest/policy/lockfile changes together.

## Commits and delivery

Follow the repository's Gitmoji convention: e.g. `:white_check_mark: Add score conversion regression coverage`, `:recycle: Separate score conversion from VS Code`, `:memo: Document development boundaries`. Use `:bug:` for behavior fixes. Release is controlled by `.releaserc.json` and the `release` branch. Write concise PR descriptions stating completed changes and verification. Publishing or merging requires user authorization.
