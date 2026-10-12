import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { bundledExports } from './test-helpers.mjs'
import { document, applyEdits } from '../tests/helpers/format-document.cjs'
const fixture = JSON.parse(await readFile(new URL('../tests/fixtures/projecttsb/compatibility.json', import.meta.url), 'utf8'))
const { createFileTypeResolver } = await bundledExports('src/core/datapack/fileTypes.ts')
const { resourcePathFromRelative } = await bundledExports('src/core/datapack/resourcePaths.ts')
const { isRelativeResourceName } = await bundledExports('src/commands/createFile/core/names.ts')
const { isTemplatePath } = await bundledExports('src/commands/createDatapackTemplate/core/paths.ts')
const { createDatapackCommand } = await bundledExports('src/commands/createDatapackTemplate/core/command.ts')
const { formatMcfunction } = await bundledExports('src/languages/core/formatter.ts')
const { resolveVars } = await bundledExports('src/core/templates/variables.ts')
const reader = fileURLToPath(new URL('../src/utils/StringReader.ts', import.meta.url))
const { appendElemFromKey } = await bundledExports('src/utils/jsonKeyWalker.ts', {
  '.': `export { StringReader } from ${JSON.stringify(reader)}`,
  vscode: 'export class Position {}',
  '../locales': 'export const locale = key => key; export const arrayToMessage = values => values.join(",")'
})
const { stringValidator } = await bundledExports('src/utils/vscodeWrapper.ts', {
  vscode: 'export const EndOfLine = {}; export const ProgressLocation = {}; export const ViewColumn = {}; export const window = {}; export const workspace = {}; export class Uri {}',
  '.': 'export const getRadixRegExp = () => { throw new Error("Not used") }; export const parseRadixFloat = () => { throw new Error("Not used") }',
  '../locales': 'export const locale = key => key'
})
const resolver = createFileTypeResolver()
function format(input, resource) {
  const edits = formatMcfunction(input.split(/\r\n|\n/), { indent: '    ', eol: '\r\n', insertHeader: true, resourcePath: resource })
  return applyEdits(document(input, '\r\n'), edits.map(edit => ({ newText: edit.newText, range: {
    start: { line: edit.line, character: 0 }, end: { line: edit.kind === 'insert' ? edit.line : edit.line + 1, character: 0 }
  } })))
}
for (const project of fixture.projects) {
  test(`${project.repo}: pinned resource path and file-name forms remain supported`, () => {
    for (const item of project.cases) {
      assert.equal(isTemplatePath(item.relative, 'file'), true, item.path)
      assert.equal(isRelativeResourceName(item.input), true, item.path)
      assert.equal(resolver.getFileTypeFromRel(item.relative + '/', item.packFormat), item.type, item.path)
      assert.equal(resourcePathFromRelative(item.relative, item.packFormat, item.type), item.resource, item.path)
      if (item.relative.endsWith('/.mcfunction') || item.relative.endsWith('/.json')) assert.ok(item.resource.endsWith('/'))
    }
  })
  test(`${project.repo}: configured function template retains unnamed resource headers and cursor`, () => {
    for (const resource of ['foo:bar/', 'foo:bar/deep/']) {
      const lines = project.settings['mcdutil.createFile.fileTemplate'].function
      const input = resolveVars(lines, { fileResourcePath: resource, cursor: '', nowOpenFileType: 'function', nowOpenFileResourcePath: 'foo:parent/' }).join('\r\n')
      const first = format(input, resource)
      assert.equal(first.split('\r\n')[0], `#> ${resource}`)
      assert.equal(first.split(`#> ${resource}`).length, 2)
      assert.ok(first.includes('# @within function foo:parent/'))
      assert.equal(format(first, resource), first)
    }
  })
}
const asset = fixture.projects.find(project => project.repo === 'ProjectTSB/Asset')
const answers = { ItemID: '1', Rarity: '1', entity: 'armor_stand', id: '1', level: '1', method_name: 'test_method', slot: 'auto' }
for (const template of asset.settings['mcdutil.createDatapackTemplate.customTemplate']) {
  test(`Asset custom template: ${template.label}`, async () => {
    const settings = { env: { dataVersion: 'unused', dateFormat: 'unused' }, createDatapackTemplate: {
      defaultFolder: false, defaultLoadAndTick: false, defaultVanillaData: false, customTemplate: [template]
    } }
    const original = JSON.stringify(settings), files = new Map(), errors = []
    let namespace, completed = 0
    const command = createDatapackCommand({
      selectGenerator: async () => ({ isGeneratePackMcMeta: false, listenGenerateDir: async () => '/pack',
        listenDatapackNameAndRoot: async () => ({ name: 'Asset', root: '/pack' }), listenPackFormat: async () => 26,
        listenDatapackDescription: async () => 'Fixture', noticeGenerated: async () => { completed++ } }),
      getFsPath: value => value, getPath: value => value, joinPath: path.posix.join,
      locale: key => key, getDate: () => '2026-10-12', getIndent: () => 4,
      getResourcePath: value => { const rel = path.posix.relative('/pack', value); return resourcePathFromRelative(rel, 26, resolver.getFileTypeFromRel(rel + '/', 26)) },
      async listenInput(question, validate) {
        const custom = template.customQuestion?.find(item => item.question === question)
        const answer = custom ? answers[custom.name] : namespace
        assert.equal(typeof answer, 'string', question)
        if (validate) assert.equal(validate(answer), undefined, question)
        return answer
      }, stringValidator, listenPickItem: async (_question, items) => items,
      defaultTemplates: () => assert.fail('Defaults are disabled'), createProgressBar: async (_title, task) => task(() => {}),
      getVanillaData: async () => assert.fail('No remote template selected'), createDirectory: async () => {},
      pathAccessible: async value => files.has(value), createFile: async (value, content) => { assert.equal(files.has(value), false); files.set(value, content) },
      readFile: async value => files.get(value), writeFile: async (value, content) => { files.set(value, content) }, appendElemFromKey,
      showError: value => errors.push(value), showWarning: value => errors.push(value), log: () => {}
    })
    for (namespace of ['0001.compat', 'nested/0002.compat']) {
      const vars = { namespace, ...answers }
      for (const item of template.generates.filter(item => item.append)) {
        const destination = path.posix.join('/pack', resolveVars(item.rel, vars))
        if (!files.has(destination)) files.set(destination, '{"values":["existing:entry"]}')
      }
      await command(settings, 'add')
      assert.deepEqual(errors, [])
      assert.equal(JSON.stringify(settings), original)
      for (const item of template.generates) {
        const relative = resolveVars(item.rel, vars), text = files.get(path.posix.join('/pack', relative))
        assert.equal(typeof text, 'string', relative)
        const expandedNames = ['namespace', ...(template.customQuestion || []).map(question => question.name)]
        assert.ok(!new RegExp(`%(?:${expandedNames.join('|')})%`, 'i').test(text), relative)
        if (relative.endsWith('.json')) {
          const json = JSON.parse(text)
          if (item.append) {
            assert.ok(json.values.includes('existing:entry'))
            assert.ok(json.values.includes(resolveVars(item.append.elem, vars)))
          }
        } else if (relative.endsWith('.mcfunction')) {
          assert.equal(text.split('\r\n')[0], '#> ' + resourcePathFromRelative(relative, 26, 'function'), relative)
        }
      }
    }
    assert.equal(completed, 2)
  })
}
