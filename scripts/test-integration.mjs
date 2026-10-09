import { mkdtemp, cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runTests } from '@vscode/test-electron'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'mcdu-integration-'))
try {
  const workspace = join(temporary, 'datapack')
  await cp(join(root, 'tests/fixtures/datapack'), workspace, { recursive: true })
  await runTests({
    version: process.env.VSCODE_TEST_VERSION || 'stable',
    extensionDevelopmentPath: root,
    extensionTestsPath: join(root, 'tests/integration/run.cjs'),
    launchArgs: [workspace, '--disable-extensions', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust', '--disable-gpu', '--user-data-dir', join(temporary, 'profile'), '--extensions-dir', join(temporary, 'extensions')]
  })
} finally {
  await rm(temporary, { recursive: true, force: true })
}
