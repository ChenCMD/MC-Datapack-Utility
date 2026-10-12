import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import { bundledExports } from './test-helpers.mjs'

const { createDatapackCommand } = await bundledExports('src/commands/createDatapackTemplate/core/command.ts')
const template = () => ({
  label: '%namespace% %datapackName% %date%',
  customQuestion: [{ name: 'answer', question: 'Answer', pattern: '[a-z]+' }],
  generates: [
    { type: 'file', rel: '%namespace%.json', content: { nested: { namespace: '%namespace%', answer: '%answer%', root: '%datapackRoot%', date: '%date%', array: [null, { name: '%datapackName%' }, ['%answer%', null]] } } },
    { type: 'file', rel: 'append.json', content: {}, append: { key: 'values', elem: { namespace: '%namespace%', array: [null, { answer: '%answer%' }] } } },
    { type: 'file', rel: 'text.txt', content: ['%namespace%', '%answer%'] }
  ]
})
const configuration = items => ({ env: { dataVersion: 'test', dateFormat: 'format' }, createDatapackTemplate: { defaultLoadAndTick: false, defaultVanillaData: false, defaultFolder: false, customTemplate: items } })

function harness() {
  let current
  const labels = [], prompts = [], errors = [], downloads = []
  const files = new Map()
  const node = {
    isGeneratePackMcMeta: false,
    async listenGenerateDir() { return '/packs' },
    async listenDatapackNameAndRoot() { return { name: current.name, root: current.root } },
    async listenPackFormat() { return 48 },
    async listenDatapackDescription() { return 'Description' },
    async noticeGenerated() {}
  }
  const command = createDatapackCommand({
    selectGenerator: async () => node,
    getFsPath: value => value, getPath: value => value,
    joinPath: (base, rel) => path.posix.join(base, rel),
    locale: key => key, getDate: () => current.date, getIndent: () => 2,
    getResourcePath: () => '', stringValidator: () => undefined,
    async listenInput(question, validate) {
      const answer = question === 'Answer' ? current.answer : current.namespace
      prompts.push(question)
      if (validate) assert.equal(validate(answer), undefined)
      return answer
    },
    async listenPickItem(_placeholder, items) { labels.push(items.map(v => v.label)); return current.cancel ? [] : items },
    defaultTemplates: () => ({ '#load & #tick': [], 'Vanilla data': [], Folders: [] }),
    createProgressBar: async (_title, task) => task(() => {}),
    async getVanillaData(_version, source, relative) {
      downloads.push(source)
      return [{ rel: relative({ path: 'remote.txt' }), content: ['%namespace%'] }]
    },
    async createDirectory() {}, pathAccessible: async value => files.has(value),
    async createFile(value, content) { files.set(value, content) },
    readFile: async value => files.get(value),
    async writeFile(value, content) { files.set(value, content) },
    appendElemFromKey(object, key, value) { object[key].push(value); return [true] },
    showError: value => errors.push(value), log() {}
  })
  return { files, labels, prompts, errors, downloads, async run(config, values) {
    current = values
    files.set(path.posix.join(current.root, 'append.json'), '{"values":[]}')
    await command(config)
    assert.deepEqual(errors, [])
  } }
}
const runs = [
  { namespace: 'first', answer: 'alpha', name: 'one', root: '/packs/one', date: '2026-10-12' },
  { namespace: 'second', answer: 'beta', name: 'two', root: '/elsewhere/two', date: '2026-10-13' }
]

test('reusing wizard settings expands labels and nested JSON with each run’s inputs', async () => {
  const config = configuration([template()]), h = harness()
  for (const run of runs) {
    await h.run(config, run)
    assert.deepEqual(h.labels.at(-1), [`${run.namespace} ${run.name} ${run.date}`])
    assert.deepEqual(JSON.parse(h.files.get(`${run.root}/${run.namespace}.json`)), { nested: { namespace: run.namespace, answer: run.answer, root: run.root, date: run.date, array: [null, { name: run.name }, [run.answer, null]] } })
    assert.equal(h.files.get(`${run.root}/text.txt`), `${run.namespace}\r\n${run.answer}`)
  }
  assert.equal(h.prompts.filter(v => v === 'Answer').length, 2)
})

test('wizard leaves caller labels, nested JSON, arrays, null and append data untouched', async () => {
  const config = configuration([template()]), original = structuredClone(config), h = harness()
  for (const run of runs) {
    await h.run(config, run)
    assert.deepEqual(config, original)
    assert.deepEqual(JSON.parse(h.files.get(`${run.root}/append.json`)), { values: [{ namespace: run.namespace, array: [null, { answer: run.answer }] }] })
  }
})

test('displaying templates without selecting them does not consume variables', async () => {
  const config = configuration([template()]), original = structuredClone(config), h = harness()
  await h.run(config, { ...runs[0], cancel: true })
  assert.deepEqual(config, original)
  await h.run(config, runs[1])
  assert.deepEqual(h.labels.at(-1), ['second two 2026-10-13'])
})

test('template copies preserve download callbacks and repeated custom questions', async () => {
  const source = { path: 'remote', rel: value => 'download/' + value.path }
  const item = template()
  item.func = [source]
  const config = configuration([item, { label: 'duplicate question', generates: [], customQuestion: [{ ...item.customQuestion[0] }] }]), h = harness()
  for (const run of runs) {
    await h.run(config, run)
    assert.equal(h.files.get(`${run.root}/download/remote.txt`), run.namespace)
  }
  assert.equal(h.prompts.filter(v => v === 'Answer').length, 2)
  assert.ok(h.downloads.every(v => v.rel === source.rel))
  assert.equal(config.createDatapackTemplate.customTemplate[0].func[0].rel, source.rel)
})
