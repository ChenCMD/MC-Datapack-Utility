import assert from 'node:assert/strict'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'

const { createDatapackCommand } = await bundledExports('src/commands/createDatapackTemplate/core/command.ts')
const file = rel => ({ type: 'file', rel, content: ['new'] })
async function run({ items = [], fail = [], existing = {}, metadata = false, answer = "example", downloaded = [], questions = [] } = {}) {
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
    joinPath: (root, rel) => { events.push(["join", rel]); return `${root}/${rel}` },
    locale: (key, ...args) => [key, ...args].join(':'), getDate: () => '',
    getIndent: path => { events.push(["indent", path]); return 2 }, getResourcePath: path => { events.push(["resource", path]); return "" },
    listenInput: async () => answer, listenPickItem: async () => [{ label: 'Test', generates: items, customQuestion: questions, func: downloaded.length ? [{}] : [] }],
    stringValidator: () => undefined,
    defaultTemplates: () => ({ '#load & #tick': [], 'Vanilla data': [], Folders: [] }),
    createProgressBar: async (_title, task) => task(() => {}),
    getVanillaData: async () => downloaded,
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

const invalidPaths = ['file\u0080name', 'file\u0085name', 'file\u009fname', 'file\u2028name', 'file\u2029name', '.. ', '. ', 'data/.. /file', 'data/trailing./file', 'data/trailing /file', '', '/', '/tmp/outside', '//server/share', 'C:/outside', 'C:outside', 'file:///tmp/outside', '../outside', 'data/../../outside', './file', 'data/./file', 'data//file', 'data/../file', 'data/ /file', 'data/file:stream', 'data/file\\name', '..\\outside', 'C:\\outside', 'file\0name', 'file\nname']
for (const rel of invalidPaths) {
  for (const type of ['file', 'folder']) test(`reject ${type} path ${JSON.stringify(rel)} before any URI or storage access`, async () => {
    const { events, files } = await run({ items: [{ ...file(rel), type }] })
    assert.equal(files.size, 0)
    assert.ok(!events.some(([kind, value]) => kind === 'join' && value === rel))
    assert.ok(events.some(([kind, value]) => kind === 'error' && value === `create-datapack-template.invalid-path:${rel}`))
    assert.ok(!events.some(([kind]) => kind === 'complete'))
  })
}
test('file paths cannot end in slash, folders allow one trailing slash', async () => {
  const { events, files } = await run({ items: [file('file/'), { type: 'folder', rel: 'folder/' }, { type: 'folder', rel: 'folder//' }] })
  assert.equal(files.size, 0)
  assert.ok(events.some(e => e[0] === 'directory' && e[1] === '/packs/test/folder/'))
  assert.equal(events.filter(e => e[0] === 'error' && e[1].startsWith('create-datapack-template.invalid-path')).length, 2)
})
test('variable expansion cannot create traversal; valid remaining files still save', async () => {
  const { events, files } = await run({ answer: '../../outside', items: [file('data/%namespace%/file'), file('good.txt')] })
  assert.equal(files.size, 1)
  assert.equal(files.get('/packs/test/good.txt'), 'new')
  assert.ok(!events.some(e => e[0] === 'join' && e[1].includes('..')))
  assert.ok(events.some(e => e[0] === 'warning' && e[1] === 'create-datapack-template.generation-partial:1'))
})
test('invalid append preserves existing outside data without reading it', async () => {
  const { files, events } = await run({ items: [{ ...file('../outside.txt'), append: { key: '', elem: 'tail' } }], existing: { '/packs/test/../outside.txt': 'sentinel' } })
  assert.equal(files.get('/packs/test/../outside.txt'), 'sentinel')
  assert.ok(!events.some(e => e[0] === 'indent'))
})
test('download generated paths use the same validation', async () => {
  const { files, events } = await run({ downloaded: [{ rel: '../outside.txt', content: ['bad'] }, { rel: 'inside.txt', content: ['downloaded'] }] })
  assert.equal(files.size, 1)
  assert.equal(files.get('/packs/test/inside.txt'), 'downloaded')
  assert.ok(!events.some(e => e[0] === 'join' && e[1] === '../outside.txt'))
})
test('relative unicode, spaces, and percent names retain their contents', async () => {
  const { files, events } = await run({ items: [file('資料 folder/nested/50%.txt'), file('.hidden')] })
  assert.equal(files.get('/packs/test/資料 folder/nested/50%.txt'), 'new')
  assert.equal(files.get('/packs/test/.hidden'), 'new')
  assert.ok(events.some(e => e[0] === 'complete'))
})

test('custom question answers cannot supply a parent or absolute path', async () => {
  for (const answer of ['../outside', '/outside', 'C:/outside']) {
    const { files, events } = await run({ answer, questions: [{ name: 'target', question: 'Target' }], items: [file('%target%')] })
    assert.equal(files.size, 0)
    assert.ok(events.some(e => e[0] === 'error' && e[1] === `create-datapack-template.invalid-path:${answer}`))
  }
})

test('portable path policy rejects namespaces ending in a dot', async () => {
  const { events, files } = await run({ answer: 'v1.', items: [file('data/%namespace%/function/load.mcfunction')] })
  assert.equal(files.size, 0)
  assert.ok(events.some(e => e[0] === 'error' && e[1] === 'create-datapack-template.invalid-path:data/v1./function/load.mcfunction'))
})
