import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'
import { document, applyEdits } from '../tests/helpers/format-document.cjs'

// Load the core without any VS Code, locale, extension, or filesystem stubs.
const { formatMcfunction } = await bundledExports('src/languages/core/formatter.ts')
const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures/formatter.json', import.meta.url)))
function format(fixture, input = fixture.input) {
  const lines = input.split(/\r\n|\n/)
  const eol = fixture.eol || '\n'
  const options = { indent: fixture.spaces === false ? '\t' : ' '.repeat(fixture.tabSize || 2), eol,
    insertHeader: Boolean(fixture.header), resourcePath: fixture.uri?.root ? fixture.uri.resourcePath : undefined }
  const doc = document(input, eol)
  const edits = formatMcfunction(lines, options).map(edit => ({ newText: edit.newText,
    range: { start: { line: edit.line, character: 0 }, end: { line: edit.kind === 'insert' ? edit.line : edit.line + 1, character: 0 } } }))
  return applyEdits(doc, edits)
}
for (const fixture of fixtures) {
  test(`isolated formatter matches baseline: ${fixture.name}`, () => {
    assert.equal(format(fixture), fixture.expected)
    assert.equal(format(fixture, fixture.expected), fixture.secondPass ?? fixture.expected)
  })
}
test('formatter core keeps its inputs and state independent between calls', () => {
  const lines = ['# one', 'say hi', '']
  const options = { indent: '  ', eol: '\n', insertHeader: false }
  const first = formatMcfunction(lines, options)
  formatMcfunction(['#> example:other', 'say other'], { ...options, indent: '\t' })
  assert.deepEqual(formatMcfunction(lines, options), first)
  assert.deepEqual(lines, ['# one', 'say hi', ''])
})
