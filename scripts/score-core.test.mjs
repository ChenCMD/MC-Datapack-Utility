import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'

// No VS Code, extension, localization, or utility-barrel stubs: core must load alone.
const { createFormulaAnalyzer } = await bundledExports('src/commands/scoreOperation/core/formula.ts')
const { createScoreConverter } = await bundledExports('src/commands/scoreOperation/core/converter.ts')
const { opTable } = await bundledExports('src/commands/scoreOperation/types/OperateTable.ts')
const defaults = { prefix: '$MCDUtil_', objective: '_', temp: 'Temp_', isAlwaysSpecifyObject: false, valueScale: 1, customOperate: [], forceInputType: 'Default' }
const ports = { locale: (key, ...params) => [key, ...params].join(':'), requestObjective: async () => undefined, warn: () => {} }
const { formulaAnalyzer } = createFormulaAnalyzer(ports)
const { rpnToScoreOperation } = createScoreConverter(ports)
const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures/score-operation.json', import.meta.url)))
for (const fixture of fixtures) {
  test(`isolated core matches documented fixtures: ${fixture.name}`, async () => {
    const config = { ...defaults, ...fixture.config }
    const funcs = []
    const formula = formulaAnalyzer(fixture.expression.split(' '), opTable, funcs, config.valueScale)
    const result = await rpnToScoreOperation(formula, config, funcs, opTable)
    assert.deepEqual({ constants: [...result.resValues], commands: result.resFormulas }, fixture.expected)
  })
}
test('objective prompts are deduplicated per conversion and configured answers appear in output', async () => {
  const prompts = []
  const converter = createScoreConverter({ ...ports, requestObjective: async message => { prompts.push(message); return 'other' } })
  const formula = formulaAnalyzer('a = b + b'.split(' '), opTable, [], 1)
  const config = { ...defaults, isAlwaysSpecifyObject: true }
  const result = await converter.rpnToScoreOperation(formula, config, [], opTable)
  assert.deepEqual(prompts, ['formula-to-score-operation.specifying-object:b', 'formula-to-score-operation.specifying-object:a'])
  // Variables retain their answers; generated temporaries belong to the configured objective.
  assert.deepEqual(result.resFormulas, [
    'scoreboard players operation $MCDUtil_Temp_1 _ = b other',
    'scoreboard players operation $MCDUtil_Temp_1 _ += b other',
    'scoreboard players operation a other = $MCDUtil_Temp_1 _'
  ])
  await converter.rpnToScoreOperation(formula, config, [], opTable)
  assert.equal(prompts.length, 4, 'a new conversion must prompt again')
})
test('injected objective cancellation returns undefined', async () => {
  const converter = createScoreConverter(ports)
  assert.equal(await converter.rpnToScoreOperation('a', { ...defaults, isAlwaysSpecifyObject: true }, [], opTable), undefined)
})
test('parser reports errors through the supplied translator', () => {
  const parser = createFormulaAnalyzer({ ...ports, locale: key => `translated:${key}` })
  assert.throws(() => parser.formulaAnalyzer([], opTable, [], 1), { message: 'translated:formula-to-score-operation.illegal-formula' })
})
for (const expression of ['a = ( 2 ) ) + 3', 'a = if( b > 1 , 2 , 3 ) ) + 1']) {
  test(`unmatched closing parentheses are rejected: ${expression}`, () => {
    assert.throws(() => formulaAnalyzer(expression.split(' '), opTable, [], 1),
      /formula-to-score-operation.illegal-formula/)
  })
}
for (const expression of ['( a + b ) = 2', '- a = 2', '2 = 3', 'a + b = 2']) {
  test(`assignment requires a score holder: ${expression}`, () => {
    assert.throws(() => formulaAnalyzer(expression.split(' '), opTable, [], 10),
      /formula-to-score-operation.illegal-formula/)
  })
}
for (const scale of [1, 10]) {
  for (const expression of ['+ a = 2', '+ ( a ) = 2', '( + a ) = 2', '( ( + + a ) ) = 2',
    'if( b > 1 , 2 , 3 ) = 5', '( if( b > 1 , 2 , 3 ) ) = 5']) {
    test(`invalid operators and signed targets report localized errors at scale ${scale}: ${expression}`, () => {
      assert.throws(() => formulaAnalyzer(expression.split(' '), opTable, [], scale),
        /formula-to-score-operation.illegal-formula/)
    })
  }
}

for (const scale of [1, 10]) {
  for (const expression of ['a toString 2', '( a ) constructor 2']) {
    test(`unregistered prototype-name operator reports a missing operator at scale ${scale}: ${expression}`, () => {
      assert.throws(() => formulaAnalyzer(expression.split(' '), opTable, [], scale),
        /error.not-exist:operator:/)
    })
  }
}
