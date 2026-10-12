import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import { bundledExports } from './test-helpers.mjs'

const { resolveVars } = await bundledExports('src/core/templates/variables.ts')
const { ObjectSet } = await bundledExports('src/utils/ObjectSet.ts')
const { UserCancelledError, GenerateError } = await bundledExports('src/types/Error.ts')
const uri = value => ({ fsPath: value, path: value })
const defaults = { defaultLoadAndTick: false, defaultVanillaData: false, defaultFolder: false, customTemplate: [] }

async function harness({ mode = 'create', items = [], existing = {}, cancel, downloadError, failPath, core = false, generationType } = {}) {
  const files = new Map(Object.entries(existing))
  const events = []
  const prompts = []
  const root = uri('/packs/demo')
  const node = {
    isGeneratePackMcMeta: mode === 'create',
    async listenGenerateDir() { if (cancel === 'directory') throw new UserCancelledError(); return uri('/packs') },
    async listenDatapackNameAndRoot() { return { name: 'demo', root } },
    async listenPackFormat() { return 48 },
    async listenDatapackDescription() { return 'A %namespace% pack' },
    async noticeGenerated(value) { events.push(['complete', value.fsPath]) }
  }
  const ports = {
    resolveVars, ObjectSet, UserCancelledError, GenerateError,
    makeExtendQuickPickItem: value => Object.entries(value).map(([label, extend]) => ({ label, extend })),
    locale: (key, ...args) => [key, ...args].join(':'),
    getDate: () => '2026-10-12', getIndent: () => 2,
    getResourcePath: value => value.path.includes('/function/') ? 'example:' + path.basename(value.path, '.mcfunction') : '',
    isStringArray: value => Array.isArray(value) && value.every(v => typeof v === 'string'),
    stringValidator: () => undefined,
    async listenInput(question, validate) {
      prompts.push(question)
      if (cancel === 'input') throw new UserCancelledError()
      const answer = question === 'create-datapack-template.namespace-name' ? 'example' : 'custom'
      if (validate) assert.equal(validate(answer), undefined)
      return answer
    },
    async listenPickItem(_placeholder, _items, multiple) {
      if (!multiple && generationType) throw new Error('Explicit generation type must skip selection')
      if ((cancel === 'templates' && multiple) || (cancel === 'generator' && !multiple)) throw new UserCancelledError()
      return multiple ? _items : { extend: class { constructor() { return node } } }
    },
    async createProgressBar(_title, task) { return task(value => events.push(['progress', value])) },
    async getVanillaData(_version, _information, func, rel, report) {
      events.push(['download', func.path]); report(1, 1)
      if (downloadError) throw new Error('offline')
      return [{ rel: rel({ path: 'data/example/function/remote.mcfunction' }), content: ['say remote'] }]
    },
    async pathAccessible(value) { return files.has(value.path) },
    async createFile(value, bytes) { if (value.path === failPath) throw new Error('denied'); files.set(value.path, new TextDecoder().decode(bytes)); events.push(['create', value.path]) },
    async readFile(value) { return files.get(value.path) },
    async writeFile(value, content) { files.set(value.path, content); events.push(['write', value.path]) },
    appendElemFromKey(object, key, value, first) {
      if (!Array.isArray(object[key])) return [false, 'error.could-not-append-elem']
      object[key][first ? 'unshift' : 'push'](value); return [true]
    },
    showError: value => events.push(['error', value]),
    log: value => events.push(['log', value]),
    async createDirectory(value) { events.push(['directory', value.path]) },
    joinPath: (base, relative) => uri(path.posix.join(base.path, relative)),
    getFsPath: value => value.fsPath,
    getPath: value => value.path,
    selectGenerator: async () => { if (cancel === 'generator') throw new UserCancelledError(); return node },
    generator: node,
    selectedGenerator: key => { events.push(['generator', key]); return { ...node, isGeneratePackMcMeta: key === 'create' } },
    defaultTemplates: () => ({ '#load & #tick': [], 'Vanilla data': [], Folders: [] })
  }
  globalThis.__wizardPorts = ports
  const names = ['appendElemFromKey', 'createFile', 'createProgressBar', 'getDate', 'getIndent', 'getResourcePath', 'getVanillaData', 'isStringArray', 'listenInput', 'listenPickItem', 'ObjectSet', 'pathAccessible', 'readFile', 'showError', 'stringValidator', 'writeFile']
  const stubs = {
    '../../../types/Error': 'const p = globalThis.__wizardPorts; export const { GenerateError, UserCancelledError } = p',
    '../../utils': 'const p = globalThis.__wizardPorts; ' + names.map(name => `export const ${name} = p.${name}`).join(';'),
    '../../types': 'const p = globalThis.__wizardPorts; export const { GenerateError, UserCancelledError, resolveVars, makeExtendQuickPickItem } = p',
    '../../locales': 'export const locale = globalThis.__wizardPorts.locale',
    './nodes': 'const p = globalThis.__wizardPorts; class Create { constructor() { return p.selectedGenerator("create") } }; class Add { constructor() { return p.selectedGenerator("add") } }; export const genNodeTypeMap = { "create-datapack-template.create": Create, "create-datapack-template.add": Add }',
    '../../extension': 'const p = globalThis.__wizardPorts; export const codeConsole = { appendLine: p.log }; export const versionInformation = {}',
    vscode: 'export const workspace = { fs: { createDirectory: globalThis.__wizardPorts.createDirectory } }',
    '../../utils/uri': 'export const UriUtils = { joinPath: globalThis.__wizardPorts.joinPath }',
    './utils/data': 'export const dataFolder = { type: "folder", rel: "data/" }; export const pickItems = globalThis.__wizardPorts.defaultTemplates; export const packMcMetaData = pack_format => ({ type: "file", rel: "pack.mcmeta", content: { pack: { pack_format, description: "%datapackDescription%" } } })'
  }
  const config = { env: { dataVersion: 'test', dateFormat: 'ignored' }, createDatapackTemplate: { ...defaults, customTemplate: items } }
  if (core) {
    const { createDatapackCommand } = await bundledExports('src/commands/createDatapackTemplate/core/command.ts', { '../../../types/Error': stubs['../../../types/Error'] })
    await createDatapackCommand({ ...ports, createFile: (value, text) => ports.createFile(value, new TextEncoder().encode(text)), getVanillaData: (version, source, relative, report) => ports.getVanillaData(version, {}, source, relative, report) })(config)
  } else {
    const { createDatapack } = await bundledExports('src/commands/createDatapackTemplate/main.ts', stubs)
    await createDatapack(config, generationType)
  }
  return { files, events, prompts }
}

const template = generates => ({ label: '%namespace% template', generates })

for (const core of [false, true]) {
  const run = options => harness({ ...options, core })
  const scenario = (name, fn) => test(`${core ? 'core' : 'adapter'}: ${name}`, fn)
scenario('wizard creates resolved paths, CRLF text, indented metadata and folders', async () => {
  const items = [template([{ type: 'file', rel: 'data/%namespace%/function/load.mcfunction', content: ['# %fileResourcePath%', 'say %date%'] }])]
  const { files, events } = await run({ items })
  assert.equal(files.get('/packs/demo/data/example/function/load.mcfunction'), '# example:load\r\nsay 2026-10-12')
  assert.equal(files.get('/packs/demo/pack.mcmeta'), '{\n  "pack": {\n    "pack_format": 48,\n    "description": "A %namespace% pack"\n  }\n}')
  assert.ok(events.some(e => e[0] === 'directory' && e[1] === '/packs/demo/data/'))
  assert.deepEqual(events.at(-1), ['complete', '/packs/demo'])
  assert.deepEqual(events.filter(e => ['create', 'directory'].includes(e[0])).map(e => e.slice(0, 2)), [
    ['create', '/packs/demo/data/example/function/load.mcfunction'],
    ['directory', '/packs/demo/data/'],
    ['create', '/packs/demo/pack.mcmeta']
  ])
  assert.equal(items[0].label, '%namespace% template') // Caller configuration remains reusable.
})

scenario('wizard preserves existing files, appends text/JSON and omits metadata in add mode', async () => {
  const items = [template([
    { type: 'file', rel: 'keep.txt', content: ['replacement'] },
    { type: 'file', rel: 'text.txt', content: [], append: { key: '', elem: '%namespace%', addFirst: true } },
    { type: 'file', rel: 'data.json', content: {}, append: { key: 'values', elem: '%namespace%' } }
  ])]
  const { files, events } = await run({ mode: 'add', items, existing: { '/packs/demo/keep.txt': 'original', '/packs/demo/text.txt': 'tail', '/packs/demo/data.json': '{"values":["old"]}', '/packs/demo/pack.mcmeta': 'original metadata' } })
  assert.equal(files.get('/packs/demo/keep.txt'), 'original')
  assert.equal(files.get('/packs/demo/text.txt'), 'exampletail')
  assert.deepEqual(JSON.parse(files.get('/packs/demo/data.json')), { values: ['old', 'example'] })
  assert.equal(files.get('/packs/demo/pack.mcmeta'), 'original metadata')
  assert.equal(events.filter(e => e[0] === 'write').length, 2)
})

for (const cancel of ['generator', 'directory', 'input', 'templates']) scenario(`wizard cancellation at ${cancel} is silent and writes nothing`, async () => {
  const { files, events } = await run({ cancel })
  assert.equal(files.size, 0)
  assert.ok(!events.some(e => ['error', 'complete', 'create', 'directory'].includes(e[0])))
})

scenario('wizard aborts all generation when an external download rejects', async () => {
  const items = [{ ...template([{ type: 'file', rel: 'local.txt', content: ['local'] }]), func: [{ path: 'remote', rel: value => value.path }] }]
  const { files, events } = await run({ items, downloadError: true })
  assert.equal(files.size, 0)
  assert.deepEqual(events.filter(e => e[0] === 'error'), [['error', 'offline']])
  assert.ok(!events.some(e => e[0] === 'complete'))
})

scenario('wizard downloads selected external files and deduplicates custom questions', async () => {
  const question = { name: 'answer', question: 'Custom', pattern: 'custom' }
  const items = [
    { ...template([{ type: 'file', rel: 'answer.txt', content: ['%answer%'] }]), customQuestion: [question], func: [{ path: 'remote', rel: value => value.path }] },
    { ...template([]), customQuestion: [{ ...question }] }
  ]
  const { files, prompts, events } = await run({ items })
  assert.equal(files.get('/packs/demo/answer.txt'), 'custom')
  assert.equal(files.get('/packs/demo/data/example/function/remote.mcfunction'), 'say remote')
  assert.equal(prompts.filter(value => value === 'Custom').length, 1)
  assert.deepEqual(events.filter(e => ['create', 'directory'].includes(e[0])).map(e => e[1]), [
    '/packs/demo/answer.txt', '/packs/demo/data/', '/packs/demo/pack.mcmeta', '/packs/demo/data/example/function/remote.mcfunction'
  ])
})

scenario('wizard keeps partial files and announces completion after a file fails', async () => {
  const items = [template([{ type: 'file', rel: 'bad.txt', content: [] }, { type: 'file', rel: 'good.txt', content: ['ok'] }])]
  const { files, events } = await run({ items, failPath: '/packs/demo/bad.txt' })
  assert.ok(!files.has('/packs/demo/bad.txt'))
  assert.equal(files.get('/packs/demo/good.txt'), 'ok')
  assert.deepEqual(events.filter(e => e[0] === 'error'), [['error', 'denied']])
  assert.deepEqual(events.at(-1), ['complete', '/packs/demo'])
})

}

test('wizard core loads without VS Code, locales or extension initialization', async () => {
  const { createDatapackCommand } = await bundledExports('src/commands/createDatapackTemplate/core/command.ts')
  assert.equal(typeof createDatapackCommand, 'function')
})

test('default template paths and labels preserve the pre-extraction format boundaries', async () => {
  const { readFile } = await import('node:fs/promises')
  const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures/datapack-templates.json', import.meta.url), 'utf8'))
  const { pickItems } = await bundledExports('src/commands/createDatapackTemplate/utils/data.ts')
  for (const { format, groups } of fixtures) {
    const actual = Object.fromEntries(Object.entries(pickItems(format)).map(([group, items]) => [group, items.map(({ label, generates, func }) => ({ label, paths: generates.map(v => v.rel), ...(func ? { downloads: func.map(v => v.path) } : {}) }))]))
    assert.deepEqual(actual, groups, `pack_format ${format}`)
  }
})

for (const mode of ['create', 'add']) test(`adapter selects explicit ${mode} generator`, async () => {
  const { files, events } = await harness({ mode, generationType: mode })
  assert.deepEqual(events.filter(e => e[0] === 'generator'), [['generator', mode]])
  assert.equal(files.has('/packs/demo/pack.mcmeta'), mode === 'create')
  assert.deepEqual(events.at(-1), ['complete', '/packs/demo'])
})
