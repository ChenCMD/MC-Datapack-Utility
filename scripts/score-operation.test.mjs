import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'

const stubs = {
  '../../../extension': 'export const codeConsole = { appendLine() {} }',
  '../../../locales': 'export const locale = (key, ...params) => [key, ...params].join(":")',
  '../../../utils/vscodeWrapper': 'export const listenInput = async () => undefined'
}
const parser = await bundledExports('src/commands/scoreOperation/utils/formula.ts', stubs)
const converter = await bundledExports('src/commands/scoreOperation/utils/converter.ts', stubs)
const { opTable } = await bundledExports('src/commands/scoreOperation/types/OperateTable.ts')
const config = { prefix: '$MCDUtil_', objective: '_', temp: 'Temp_', forceInputType: 'Default', isAlwaysSpecifyObject: false, customOperate: [], valueScale: 1 }

export async function convert(expression, overrides = {}) {
  const settings = { ...config, ...overrides }
  const functions = []
  const formula = parser.formulaAnalyzer(expression.split(' '), opTable, functions, settings.valueScale)
  const result = await converter.rpnToScoreOperation(formula, settings, functions, opTable)
  return result && { constants: [...result.resValues], commands: result.resFormulas }
}

const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures/score-operation.json', import.meta.url)))
for (const fixture of fixtures) {
  test(`score conversion: ${fixture.name}`, async () => {
    assert.deepEqual(await convert(fixture.expression, fixture.config), fixture.expected)
  })
}
for (const expression of ['', 'a ? b', '( a + 1', ')']) {
  test(`invalid score expression rejects: ${JSON.stringify(expression)}`, async () => {
    await assert.rejects(convert(expression), error => ['GenerateError', 'ParsingError'].includes(error.name))
  })
}
test('cancelling objective input produces no result', async () => {
  assert.equal(await convert('a + 1', { isAlwaysSpecifyObject: true }), undefined)
})
