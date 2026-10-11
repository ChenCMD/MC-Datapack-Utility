import assert from 'node:assert/strict'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'
import { executeScores } from '../tests/helpers/scoreboard.cjs'

const { createFormulaAnalyzer } = await bundledExports('src/commands/scoreOperation/core/formula.ts')
const { createScoreConverter } = await bundledExports('src/commands/scoreOperation/core/converter.ts')
const { opTable } = await bundledExports('src/commands/scoreOperation/types/OperateTable.ts')
const ports = { locale: key => key, requestObjective: async () => undefined, warn: () => {} }
const functionEntry = (identifier, args, namely) => ({ identifier, type: 'fn', order: 18, assocLow: 'R', arity: args.length, destination: { args, namely } })
const operators = { ...opTable,
  'sum(': functionEntry('sum(', ['left', 'right'], 'left + right'),
  'product(': functionEntry('product(', ['left', 'right'], 'left * right'),
  'twice(': functionEntry('twice(', ['value'], 'value + value'),
  'offset(': functionEntry('offset(', ['value'], 'value + 1')
}
async function convert(expression, valueScale = 1) {
  const funcs = []
  const config = { prefix: '$MCDUtil_', objective: '_', temp: 'Temp_', valueScale, isAlwaysSpecifyObject: false }
  const formula = createFormulaAnalyzer(ports).formulaAnalyzer(expression.split(' '), operators, funcs, valueScale)
  const result = await createScoreConverter(ports).rpnToScoreOperation(formula, config, funcs, operators)
  return { result, funcs }
}

for (const [expression, expected] of [
  ['a = sum( 2 + 3 , 4 )', 9],
  ['a = product( 2 + 3 , 4 )', 20],
  ['a = product( ( 2 + 3 ) * 4 , 2 ) + 1', 41],
  ['a = sum( - 2 + 3 , 4 )', 5],
  ['a = sum( 2 , - ( 3 + 4 ) )', -5],
  ['a = twice( 2 + 3 )', 10],
  ['a = twice( b + 1 )', 8],
  ['a = product( sum( 2 , 3 ) , 4 + 1 )', 25],
  ['a = sum( product( 2 + 3 , 4 ) , 1 )', 21],
  ['a = 100 - product( 2 + 3 , 4 ) * 2', 60]
]) {
  test(`custom argument preserves its expression: ${expression}`, async () => {
    const { result } = await convert(expression)
    assert.equal(executeScores(result, [['b', '_', 3]]).get('a _'), expected)
  })
}

for (const [expression, expected] of [
  ['a = sum( 2 + 3 , 4 )', 90],
  ['a = twice( 2 + 3 )', 100],
  ['a = offset( 2 + 3 )', 60],
  ['a = sum( sum( 2 , 3 ) , 4 )', 90],
  ['a = product( 2 + 3 , 4 )', 2000]
]) {
  test(`custom argument applies scale once: ${expression}`, async () => {
    const { result } = await convert(expression, 10)
    assert.equal(executeScores(result).get('a _'), expected)
  })
}

for (const scale of [1, 10]) {
  test(`repeated conditional argument is evaluated once at scale ${scale}`, async () => {
    const { result, funcs } = await convert('a = twice( if( b > 1 , 2 + 3 , 4 ) )', scale)
    assert.equal(funcs.length, 1)
    for (const b of [0, 2]) assert.equal(executeScores(result, [['b', '_', b]]).get('a _'), (b > 1 ? 10 : 8) * scale)
  })
}

test('custom function expressions remain valid conditional branches', async () => {
  const { result } = await convert('a = if( b > 1 , sum( 2 + 3 , 4 ) , twice( 2 + 3 ) )', 10)
  for (const b of [0, 2]) assert.equal(executeScores(result, [['b', '_', b]]).get('a _'), b > 1 ? 90 : 100)
})
