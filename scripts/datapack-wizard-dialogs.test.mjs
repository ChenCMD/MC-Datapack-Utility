import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import { bundledExports } from './test-helpers.mjs'

const errors = await bundledExports('src/types/Error.ts')
const errorStub = 'export const { GenerateError, UserCancelledError, NotOpenTextDocumentError, NotOpenWorkspaceError } = globalThis.__wizardDialogErrors'
globalThis.__wizardDialogErrors = errors

const uri = value => ({ path: value, fsPath: value })
const locale = (key, ...args) => [key, ...args].join(':')

// Keep the actual nodes, message IDs, validators and UI wrappers. Only their
// external window, filesystem/root lookup, URI and localization boundaries vary.
async function harness({ directories = ['/packs'], inputs = [], warnings = [], information = [], inside, duplicate = false, metadata = '{"pack":{"pack_format":48,"description":"demo"}}', readError } = {}) {
  const events = []
  const inputOptions = []
  const root = uri('/packs/demo')
  const take = answers => { assert.ok(answers.length, 'Unexpected additional dialog'); return answers.shift() }
  const window = {
    async showOpenDialog(options) {
      events.push(['directory', options])
      const answer = take(directories)
      return answer === undefined ? undefined : [uri(answer)]
    },
    async showInputBox(options) {
      events.push(['input', options.prompt]); inputOptions.push(options)
      const answer = take(inputs)
      if (answer !== undefined && options.validateInput) assert.equal(await options.validateInput(answer), undefined)
      return answer
    },
    async showWarningMessage(message, options, ...items) {
      events.push(['warning', message, options, items])
      const answer = take(warnings)
      if (answer === undefined) return undefined
      const item = items.find(value => value.id === answer)
      assert.ok(item, `Unknown warning answer: ${answer}`)
      return item
    },
    async showInformationMessage(message, options, ...items) {
      events.push(['information', message, options, items])
      if (!items.length) return undefined
      const answer = take(information)
      if (answer === undefined) return undefined
      const item = items.find(value => value.id === answer)
      assert.ok(item, `Unknown information answer: ${answer}`)
      return item
    }
  }
  globalThis.__wizardDialog = {
    locale, window,
    commands: { async executeCommand(...args) { events.push(['command', ...args]) } },
    async getDatapackRoot(value) { events.push(['find-root', value.path]); return typeof inside === 'function' ? inside(value) : inside ? root : undefined },
    async isDatapackRoot(value) { events.push(['is-root', value.path]); return typeof duplicate === 'function' ? duplicate(value) : duplicate },
    async readFile(value) { events.push(['read', value.path]); if (readError) throw readError; return metadata },
    UriUtils: { basename: value => path.posix.basename(value.path), joinPath: (value, name) => uri(path.posix.join(value.path, name)) }
  }
  const stubs = {
    '../types/Error': errorStub,
    '../../../types/Error': errorStub,
    vscode: 'const p = globalThis.__wizardDialog; export const { window, commands } = p; export const Uri = {}; export const workspace = { workspaceFolders: [{ uri: { path: "/workspace" } }] }; export const EndOfLine = { LF: 1, CRLF: 2 }; export const ProgressLocation = { Notification: 15 }; export const ViewColumn = { Beside: 2 }',
    '../../../locales': 'export const locale = globalThis.__wizardDialog.locale',
    '../locales': 'export const locale = globalThis.__wizardDialog.locale',
    '../../../utils/common': 'export const { getDatapackRoot, isDatapackRoot } = globalThis.__wizardDialog',
    '../../../utils/file': 'export const readFile = globalThis.__wizardDialog.readFile',
    '../../../utils/uri': 'export const UriUtils = globalThis.__wizardDialog.UriUtils',
    '.': 'export const getRadixRegExp = () => { throw new Error("Unused number validator") }; export const parseRadixFloat = () => { throw new Error("Unused number validator") }'
  }
  const create = await bundledExports('src/commands/createDatapackTemplate/nodes/CreateTemplateGenNode.ts', stubs)
  const add = await bundledExports('src/commands/createDatapackTemplate/nodes/AddTemplateGenNode.ts', stubs)
  return { create: new create.CreateTemplateGenNode(), add: new add.AddTemplateGenNode(), events, inputOptions, root }
}

const cancelled = error => error instanceof errors.UserCancelledError
const noPackFormat = error => error instanceof errors.GenerateError && error.message === 'create-datapack-template.no-pack-format'

test('Create directory selection uses folder-only dialog and returns selected URI', async () => {
  const h = await harness()
  assert.equal((await h.create.listenGenerateDir()).path, '/packs')
  assert.deepEqual(h.events.map(event => event[0]), ['directory', 'find-root'])
  assert.deepEqual(h.events[0][1], { canSelectFiles: false, canSelectFolders: true, canSelectMany: false, defaultUri: { path: '/workspace' }, openLabel: 'select', title: 'create-datapack-template.dialog-title-directory', filters: undefined })
})

for (const mode of ['create', 'add']) test(`${mode} directory cancellation preserves UserCancelledError`, async () => {
  const h = await harness({ directories: [undefined] })
  await assert.rejects(h[mode].listenGenerateDir(), cancelled)
  assert.deepEqual(h.events.map(event => event[0]), ['directory'])
})

for (const answer of ['yes', 'no', undefined]) test(`Create inside-datapack answer ${answer ?? 'dismiss'} ${answer === 'yes' ? 'accepts' : 'cancels'}`, async () => {
  const h = await harness({ inside: true, warnings: [answer] })
  if (answer === 'yes') assert.equal((await h.create.listenGenerateDir()).path, '/packs')
  else await assert.rejects(h.create.listenGenerateDir(), cancelled)
  const warning = h.events.find(event => event[0] === 'warning')
  assert.equal(warning[1], 'create-datapack-template.inside-datapack:demo')
  assert.deepEqual(warning[3].map(item => item.id), ['yes', 'reselect', 'no'])
})

test('Create reselects directory and checks the new location', async () => {
  const h = await harness({ directories: ['/packs/demo/data', '/elsewhere'], inside: value => value.path.startsWith('/packs') ? uri('/packs/demo') : undefined, warnings: ['reselect'] })
  assert.equal((await h.create.listenGenerateDir()).path, '/elsewhere')
  assert.deepEqual(h.events.filter(event => event[0] === 'find-root').map(event => event[1]), ['/packs/demo/data', '/elsewhere'])
})

test('Create cancellation after reselect exits without another warning', async () => {
  const h = await harness({ directories: ['/packs/demo', undefined], inside: true, warnings: ['reselect'] })
  await assert.rejects(h.create.listenGenerateDir(), cancelled)
  assert.equal(h.events.filter(event => event[0] === 'warning').length, 1)
})

for (const answer of ['yes', 'no', undefined]) test(`Create duplicate name answer ${answer ?? 'dismiss'} ${answer === 'yes' ? 'accepts' : 'cancels'}`, async () => {
  const h = await harness({ inputs: ['demo'], duplicate: true, warnings: [answer] })
  if (answer === 'yes') assert.deepEqual(await h.create.listenDatapackNameAndRoot(uri('/packs')), { name: 'demo', root: h.root })
  else await assert.rejects(h.create.listenDatapackNameAndRoot(uri('/packs')), cancelled)
  assert.equal(h.events.find(event => event[0] === 'warning')[1], 'create-datapack-template.duplicate-datapack:demo')
})

test('Create rename checks the new name under the original parent', async () => {
  const h = await harness({ inputs: ['demo', 'other'], duplicate: value => value.path === '/packs/demo', warnings: ['rename'] })
  assert.deepEqual(await h.create.listenDatapackNameAndRoot(uri('/packs')), { name: 'other', root: uri('/packs/other') })
  assert.deepEqual(h.events.filter(event => event[0] === 'is-root').map(event => event[1]), ['/packs/demo', '/packs/other'])
})

test('Create name validator rejects dot traversal, empty names and filesystem delimiters', async () => {
  const h = await harness({ inputs: ['My pack'] })
  await h.create.listenDatapackNameAndRoot(uri('/packs'))
  const validate = h.inputOptions[0].validateInput
  assert.equal(validate(''), 'error.input-blank:datapack-name')
  for (const character of '\\/:*?"<>|') assert.equal(validate(`a${character}b`), `error.unexpected-character:${character}`)
  for (const name of ['.', '..']) assert.equal(validate(name), `error.unexpected-character:${name}`)
  for (const name of ['My pack', '日本語 パック', '.hidden', 'v1.', 'a..b', '...', 'CON']) assert.equal(validate(name), undefined)
})

for (const name of ['My pack', '日本語 パック', '.hidden', 'a..b']) test(`Create accepted name ${JSON.stringify(name)} returns a child URI under the selected directory`, async () => {
  const h = await harness({ inputs: [name] })
  assert.deepEqual(await h.create.listenDatapackNameAndRoot(uri('/packs')), { name, root: uri(`/packs/${name}`) })
  assert.deepEqual(h.events.filter(event => event[0] === 'is-root').map(event => event[1]), [`/packs/${name}`])
})

for (const [input, expected] of [['48', 48], ['2abc', 2], ['1.5', 1], [' 9 ', 9], ['+7', 7]]) test(`Create pack format preserves parseInt behavior for ${JSON.stringify(input)}`, async () => {
  const h = await harness({ inputs: [input] })
  assert.equal(await h.create.listenPackFormat(), expected)
  const validate = h.inputOptions[0].validateInput
  for (const invalid of ['', 'abc', '0', '-1', '0x10']) assert.equal(validate(invalid), 'error.invalid-number')
})

for (const method of ['listenDatapackNameAndRoot', 'listenPackFormat', 'listenDatapackDescription']) test(`Create ${method} cancellation propagates`, async () => {
  const h = await harness({ inputs: [undefined] })
  await assert.rejects(h.create[method](uri('/packs')), cancelled)
})

test('Create description accepts empty and literal text without validation', async () => {
  const h = await harness({ inputs: ['', 'A %namespace% pack'] })
  assert.equal(await h.create.listenDatapackDescription(), '')
  assert.equal(await h.create.listenDatapackDescription(), 'A %namespace% pack')
  assert.ok(h.inputOptions.every(options => options.validateInput === undefined))
})

for (const answer of ['open', 'no', undefined]) test(`Create completion answer ${answer ?? 'dismiss'}`, async () => {
  const h = await harness({ information: [answer] })
  if (answer === undefined) await assert.rejects(h.create.noticeGenerated(h.root), cancelled)
  else await h.create.noticeGenerated(h.root)
  assert.deepEqual(h.events.filter(event => event[0] === 'command'), answer === 'open' ? [['command', 'vscode.openFolder', h.root, { forceNewWindow: true }]] : [])
})

test('Add checks selected root, keeps name/root and does not create metadata', async () => {
  const h = await harness({ directories: ['/packs/demo'], duplicate: true })
  assert.deepEqual(await h.add.listenGenerateDir(), h.root)
  assert.deepEqual(await h.add.listenDatapackNameAndRoot(h.root), { name: 'demo', root: h.root })
  assert.equal(h.add.isGeneratePackMcMeta, false)
  assert.equal(h.create.isGeneratePackMcMeta, true)
  assert.equal(h.events[0][1].title, 'create-datapack-template.dialog-title-datapack')
})

test('Add rejects a directory without metadata', async () => {
  const h = await harness()
  await assert.rejects(h.add.listenGenerateDir(), error => error instanceof errors.GenerateError && error.message === 'create-datapack-template.not-datapack')
})

for (const value of [48, 0, -1, 1.5]) test(`Add pack format preserves numeric value ${value}`, async () => {
  const h = await harness({ metadata: JSON.stringify({ pack: { pack_format: value } }) })
  assert.equal(await h.add.listenPackFormat(h.root), value)
  assert.deepEqual(h.events, [['read', '/packs/demo/pack.mcmeta']])
})

for (const metadata of ['{', 'null', '{}', '{"pack":null}', '{"pack":{"description":"demo"}}', '{"pack":{"pack_format":"48"}}', '{"pack":{"pack_format":[48,0]}}', '{"pack":{"max_format":48}}']) test(`Add pack format maps invalid/missing metadata ${metadata} to localized error`, async () => {
  const h = await harness({ metadata })
  await assert.rejects(h.add.listenPackFormat(h.root), noPackFormat)
})

test('Add pack format maps read failure to localized error', async () => {
  const h = await harness({ readError: new Error('denied') })
  await assert.rejects(h.add.listenPackFormat(h.root), noPackFormat)
})

for (const [metadata, expected] of [['{', ''], ['{}', ''], ['{"pack":null}', ''], ['{"pack":{"description":null}}', ''], ['{"pack":{"description":"A pack"}}', 'A pack'], ['{"pack":{"description":{"text":"A pack"}}}', { text: 'A pack' }], ['{"pack":{"description":0}}', 0]]) test(`Add description preserves fallback/type behavior for ${metadata}`, async () => {
  const h = await harness({ metadata })
  assert.deepEqual(await h.add.listenDatapackDescription(h.root), expected)
})

test('Add description propagates read failure and non-SyntaxError JSON shape failure', async () => {
  const denied = new Error('denied')
  const h = await harness({ readError: denied })
  await assert.rejects(h.add.listenDatapackDescription(h.root), error => error === denied)
  const nullMetadata = await harness({ metadata: 'null' })
  await assert.rejects(nullMetadata.add.listenDatapackDescription(nullMetadata.root), TypeError)
})

test('Add completion only shows an information message', async () => {
  const h = await harness()
  await h.add.noticeGenerated()
  assert.deepEqual(h.events, [['information', 'create-datapack-template.complete', { modal: undefined }, []]])
})

for (const mode of ['create', 'add']) test(`core recognizes cancellation from real ${mode} node and performs no later effects`, async () => {
  const h = await harness({ directories: [undefined] })
  const { createDatapackCommand } = await bundledExports('src/commands/createDatapackTemplate/core/command.ts', { '../../../types/Error': errorStub })
  const effects = []
  // These ports deliberately fail if cancellation ever continues to generation.
  const ports = new Proxy({ selectGenerator: async () => h[mode], showError: message => effects.push(['error', message]), log: message => effects.push(['log', message]) }, {
    get(target, key) { return key in target ? target[key] : () => { throw new Error(`Unexpected post-cancellation port ${String(key)}`) } }
  })
  await createDatapackCommand(ports)({ env: {}, createDatapackTemplate: {} }, mode)
  assert.deepEqual(effects, [])
  assert.deepEqual(h.events.map(event => event[0]), ['directory'])
})
