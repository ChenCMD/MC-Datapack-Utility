import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'
import { document, applyEdits } from '../tests/helpers/format-document.cjs'

const { McfunctionFormatter } = await bundledExports('src/languages/McfunctionFormatter.ts', {
  vscode: `
    export class Position { constructor(line, character) { this.line = line; this.character = character } }
    export class Range { constructor(a,b,c,d) { this.start = new Position(a,b); this.end = new Position(c,d) } }
    export const TextEdit = {
      replace: (range, newText) => ({range, newText}),
      insert: (position, newText) => ({range:{start:position,end:position},newText})
    }
  `,
  '../utils/vscodeWrapper': `export const getEolString = eol => eol === 2 ? '\\r\\n' : '\\n';`,
  '../utils/common': `export const getPackFormat = async () => 7; export const getDatapackRoot = async uri => uri.root ? uri : undefined;
    export const getResourcePath = uri => uri.resourcePath;`,
  '../locales': 'export const locale = key => key'
})

export async function format(fixture, text = fixture.input) {
  const doc = document(text, fixture.eol || '\n', fixture.uri)
  const provider = new McfunctionFormatter({ mcfFormatter: { doInsertIMPDocument: Boolean(fixture.header) } })
  return applyEdits(doc, await provider.provideDocumentFormattingEdits(doc, {
    insertSpaces: fixture.spaces !== false, tabSize: fixture.tabSize || 2
  }))
}
const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures/formatter.json', import.meta.url)))
for (const fixture of fixtures) {
  test(`formatter output: ${fixture.name}`, async () => {
    const output = await format(fixture)
    assert.equal(output, fixture.expected)
    assert.equal(await format(fixture, output), fixture.expected)
    assert.equal(await format(fixture, await format(fixture, output)), fixture.expected)
  })
}
