import assert from 'node:assert/strict'
import test from 'node:test'
import { executeScores } from '../tests/helpers/scoreboard.cjs'
import { bundledExports } from './test-helpers.mjs'

const { createFormulaAnalyzer } = await bundledExports('src/commands/scoreOperation/core/formula.ts')
const { createScoreConverter } = await bundledExports('src/commands/scoreOperation/core/converter.ts')
const { opTable } = await bundledExports('src/commands/scoreOperation/types/OperateTable.ts')
const ports = { locale: (key, ...params) => [key, ...params].join(':'), requestObjective: async () => undefined, warn: () => {} }
async function convert(expression, valueScale) {
  const config = { prefix: '$MCDUtil_', objective: '_', temp: 'Temp_', isAlwaysSpecifyObject: false, valueScale, customOperate: [], forceInputType: 'Default' }
  const funcs = []
  const formula = createFormulaAnalyzer(ports).formulaAnalyzer(expression.split(' '), opTable, funcs, valueScale)
  return createScoreConverter(ports).rpnToScoreOperation(formula, config, funcs, opTable)
}

for (const scale of [1, 10]) {
  test(`conditional branch values are scaled once at scale ${scale}`, async () => {
    const result = await convert('a = if( b > 1 , 2 , 3 )', scale)
    for (const b of [0, 2]) {
      assert.equal(executeScores(result, [['b', '_', b]]).get('a _'), (b > 1 ? 2 : 3) * scale)
    }
  })
}

for (const [expression, thenValue, elseValue] of [
  ['a = if( b > 1 , c , d )', 40, 50],
  ['a = if( b > 1 , c + 1 , d - 1 )', 50, 40],
  ['a = if( b > 1 , 2 , 3 ) + 1', 30, 40],
  ['a = 1 + if( b > 1 , 2 , 3 )', 30, 40],
  ['a = if( b > 1 , 2 , 3 ) * 2', 400, 600],
  ['a = - if( b > 1 , 2 , 3 ) + 1', -10, -20],
  ['a += if( b > 1 , 2 , 3 )', 27, 37],
  ['a = if( b > 1 , 2 , 3 ) + if( c > 1 , 4 , 5 )', 60, 70]
]) {
  test(`scaled conditional results retain surrounding arithmetic: ${expression}`, async () => {
    const result = await convert(expression, 10)
    for (const b of [0, 2]) {
      const initial = [['a', '_', 7], ['b', '_', b], ['c', '_', 4], ['d', '_', 5]]
      assert.equal(executeScores(result, initial).get('a _'), b > 1 ? thenValue : elseValue)
    }
  })
}

test('zero scale preserves a zero-valued conditional result', async () => {
  const result = await convert('a = if( b > 1 , 2 , 3 )', 0)
  assert.equal(executeScores(result, [['b', '_', 2]]).get('a _'), 0)
})
