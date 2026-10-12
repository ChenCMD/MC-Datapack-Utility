import assert from 'node:assert/strict'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'

const { createDatapackCommand } = await bundledExports('src/commands/createDatapackTemplate/core/command.ts')
const file = rel => ({ type: 'file', rel, content: ['new'] })
async function run({ items = [], fail = [], existing = {}, metadata = false } = {}) {
  const events = [], files = new Map(Object.entries(existing))
  const deny = path => { if (fail.includes(path)) throw new Error(`denied:${path}`) }
  const ports = {
    selectGenerator: async () => ({
      isGeneratePackMcMeta: metadata,
      listenGenerateDir: async () => '/packs',
      listenDatapackNameAndRoot: async () => ({ name: 'test', root: '/packs/test' }),
      listenPackFormat: async () => 48,
      listenDatapackDescription: async () => 'Test',
      noticeGenerated: async () => events.push(['complete'])
    }),
    getFsPath: value => value, getPath: value => value,
    joinPath: (root, rel) => `${root}/${rel}`,
    locale: (key, ...args) => [key, ...args].join(':'), getDate: () => '',
    getIndent: () => 2, getResourcePath: () => '',
    listenInput: async () => 'example', listenPickItem: async () => [{ label: 'Test', generates: items }],
    stringValidator: () => undefined,
    defaultTemplates: () => ({ '#load & #tick': [], 'Vanilla data': [], Folders: [] }),
    createProgressBar: async (_title, task) => task(() => {}),
    getVanillaData: async () => [],
    createDirectory: async path => { deny(path); events.push(['directory', path]) },
    pathAccessible: async path => files.has(path),
    createFile: async (path, text) => { deny(path); files.set(path, text) },
    readFile: async path => files.get(path),
    writeFile: async (path, text) => { deny(path); files.set(path, text) },
    appendElemFromKey: () => [false, 'error.could-not-append-elem'],
    showError: message => events.push(['error', message]),
    showWarning: message => events.push(['warning', message]), log: () => {}
  }
  await createDatapackCommand(ports)({ env: { dataVersion: 'unused', dateFormat: 'unused' }, createDatapackTemplate: { defaultLoadAndTick: false, defaultVanillaData: false, defaultFolder: false, customTemplate: [] } })
  return { events, files }
}
const summary = events => events.filter(([type, message]) => type === 'complete' || (['error', 'warning'].includes(type) && message.startsWith('create-datapack-template.generation-')))

test('all successful files retain the completion notice', async () => {
  const { events } = await run({ items: [file('good.txt')], metadata: true })
  assert.deepEqual(summary(events), [['complete']])
})
test('partial file failure preserves later files and reports a warning without completion', async () => {
  const { events, files } = await run({ items: [file('bad.txt'), file('good.txt')], fail: ['/packs/test/bad.txt'] })
  assert.equal(files.get('/packs/test/good.txt'), 'new')
  assert.ok(events.some(e => e[1] === 'denied:/packs/test/bad.txt'))
  assert.deepEqual(summary(events), [['warning', 'create-datapack-template.generation-partial:1']])
})
test('all files failed is an error even if the implicit data folder succeeds', async () => {
  const { events, files } = await run({ items: [file('bad.txt')], fail: ['/packs/test/bad.txt'] })
  assert.equal(files.size, 0)
  assert.deepEqual(summary(events), [['error', 'create-datapack-template.generation-failed:1']])
})
test('existing files without append are successful preserved operations', async () => {
  const { events, files } = await run({ items: [file('keep.txt'), file('bad.txt')], existing: { '/packs/test/keep.txt': 'old' }, fail: ['/packs/test/bad.txt'] })
  assert.equal(files.get('/packs/test/keep.txt'), 'old')
  assert.deepEqual(summary(events), [['warning', 'create-datapack-template.generation-partial:1']])
})
test('append save failure is reported and preserves original contents', async () => {
  const item = { ...file('existing.txt'), append: { key: '', elem: 'tail' } }
  const { events, files } = await run({ items: [item], existing: { '/packs/test/existing.txt': 'old' }, fail: ['/packs/test/existing.txt'] })
  assert.equal(files.get('/packs/test/existing.txt'), 'old')
  assert.deepEqual(summary(events), [['error', 'create-datapack-template.generation-failed:1']])
})
test('invalid JSON append is a generation failure', async () => {
  const item = { ...file('existing.json'), append: { key: 'values', elem: 'tail' } }
  const { events, files } = await run({ items: [item], existing: { '/packs/test/existing.json': '{}' } })
  assert.equal(files.get('/packs/test/existing.json'), '{}')
  assert.deepEqual(summary(events), [['error', 'create-datapack-template.generation-failed:1']])
})
test('metadata save failure suppresses the open-folder completion path', async () => {
  const { events } = await run({ items: [file('good.txt')], metadata: true, fail: ['/packs/test/pack.mcmeta'] })
  assert.deepEqual(summary(events), [['warning', 'create-datapack-template.generation-partial:1']])
})
test('directory failure after successful files is partial', async () => {
  const { events } = await run({ items: [file('good.txt')], fail: ['/packs/test/data/'] })
  assert.deepEqual(summary(events), [['warning', 'create-datapack-template.generation-partial:1']])
})
test('folder-only success keeps completion', async () => {
  const { events } = await run()
  assert.deepEqual(summary(events), [['complete']])
})
test('folder-only partial failure warns', async () => {
  const { events } = await run({ items: [{ type: 'folder', rel: 'bad/' }], fail: ['/packs/test/bad/'] })
  assert.deepEqual(summary(events), [['warning', 'create-datapack-template.generation-partial:1']])
})
test('folder-only total failure errors', async () => {
  const { events } = await run({ fail: ['/packs/test/data/'] })
  assert.deepEqual(summary(events), [['error', 'create-datapack-template.generation-failed:1']])
})
