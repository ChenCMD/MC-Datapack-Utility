import assert from 'node:assert/strict'
import test from 'node:test'
import { executeScores } from '../tests/helpers/scoreboard.cjs'
import { bundledExports } from './test-helpers.mjs'

const { createFormulaAnalyzer } = await bundledExports('src/commands/scoreOperation/core/formula.ts')
const { createScoreConverter } = await bundledExports('src/commands/scoreOperation/core/converter.ts')
const { opTable } = await bundledExports('src/commands/scoreOperation/types/OperateTable.ts')
const defaults = { prefix: '$MCDUtil_', objective: '_', temp: 'Temp_', isAlwaysSpecifyObject: false, valueScale: 1, customOperate: [], forceInputType: 'Default' }
const defaultPorts = { locale: (key, ...params) => [key, ...params].join(':'), requestObjective: async () => undefined, warn: () => {} }
async function convert(expression, config = {}, ports = {}) {
  const settings = { ...defaults, ...config }
  const dependencies = { ...defaultPorts, ...ports }
  const funcs = []
  const { formulaAnalyzer } = createFormulaAnalyzer(dependencies)
  const formula = formulaAnalyzer(expression.split(' '), opTable, funcs, settings.valueScale)
  return createScoreConverter(dependencies).rpnToScoreOperation(formula, settings, funcs, opTable)
}

for (const literal of ['0x10', '016', '16.0']) {
  test(`numeric literal ${literal} initializes the score it reads`, async () => {
    const result = await convert(`a = ${literal}`)
    assert.equal(executeScores(result).get('a _'), 16)
  })
}

for (const [expression, expected] of [
  ['a = - 2 + 3', 1], ['a = - 2 * 3 + 4', -2],
  ['a = 2 * - 3 + 4', -2], ['a = - ( 2 + 3 ) + 7', 2],
  ['a = - 2 + ( 3 * 4 )', 10], ['a = - - 2 + 3', 5],
  ['a = + 2 + 3', 5], ['a = 2 * - 3', -6], ['a = - 2 * - 3', 6],
  ['a = 2 * ( - 3 + 4 )', 2], ['a = - 2 * ( 3 + 4 )', -14], ['a = - 2 - 3 - 4', -9], ['a = 2 * - 3 + 4 + 5', 3],
  ['a = 2 - - 3 + 4', 9], ['a = 2 - - 3 - 4', 1],
  ['a = ( ( 2 + 3 ) ) * 4', 20], ['a = ( 2 + 3 ) * ( 4 + 5 )', 45]
]) {
  test(`unary signs bind to their operand: ${expression}`, async () => {
    assert.equal(executeScores(await convert(expression)).get('a _'), expected)
  })
}
test('unary signs bind to a function result before following arithmetic', async () => {
  const result = await convert('a = - if( b > 1 , 2 , 3 ) * 2 + 7')
  for (const b of [0, 2]) assert.equal(executeScores(result, [['b', '_', b]]).get('a _'), b > 1 ? 3 : 1)
})

for (const [expression, expected] of [['a = 6 / 2', 3], ['a = 7 % 4', 30]]) {
  test(`scaled operands keep primary binding: ${expression}`, async () => {
    const result = await convert(expression, { valueScale: 10 })
    const resultKey = result.resFormulas.at(-1).split(' ').slice(-2).join(' ')
    assert.equal(executeScores(result, [['a', '_', 0]]).get(resultKey), expected)
  })
}
test('equivalent literal spellings share one initialized constant', async () => {
  const result = await convert('a = 0x10 + 16')
  assert.equal(result.resValues.size, 1)
  assert.equal(executeScores(result).get('a _'), 32)
})

for (const [operator, compare] of [
  ['>', b => b > 1], ['>=', b => b >= 1], ['<', b => b < 1],
  ['<=', b => b <= 1], ['==', b => b === 1], ['!=', b => b !== 1]
]) {
  test(`conditional ${operator} uses initialized comparison scores for both branches`, async () => {
    const result = await convert(`a = if( b ${operator} 1 , 2 , 3 )`)
    for (const b of [0, 1, 2]) {
      assert.equal(executeScores(result, [['b', '_', b]]).get('a _'), compare(b) ? 2 : 3, `b=${b}`)
    }
  })
}

test('repeated variables keep their objective while temporaries use the configured objective', async () => {
  const prompts = []
  const result = await convert('a = b + b', { isAlwaysSpecifyObject: true, objective: 'internal' }, {
    requestObjective: async message => {
      prompts.push(message)
      return message.endsWith(':b') ? 'source' : 'destination'
    }
  })
  assert.deepEqual(prompts, ['formula-to-score-operation.specifying-object:b', 'formula-to-score-operation.specifying-object:a'])
  assert.equal(executeScores(result, [['b', 'source', 7]]).get('a destination'), 14)
})
test('objective answers persist across condition and branch conversions', async () => {
  const prompts = []
  const result = await convert('a = if( b > 1 , b + b , b * 2 )', { isAlwaysSpecifyObject: true }, {
    requestObjective: async message => { prompts.push(message); return 'other' }
  })
  assert.equal(prompts.filter(message => message.endsWith(':b')).length, 1)
  for (const b of [0, 2]) {
    assert.equal(executeScores(result, [['b', 'other', b]]).get('a other'), b * 2)
  }
})
for (const cancelled of ['b', 'c', 'd', 'e']) {
  test(`cancelling conditional objective ${cancelled} returns no partial conversion or further prompts`, async () => {
    const prompts = []
    const result = await convert('a = if( b > c , d , e )', { isAlwaysSpecifyObject: true }, {
      requestObjective: async message => {
        const variable = message.split(':').at(-1)
        prompts.push(variable)
        return variable === cancelled ? undefined : 'other'
      }
    })
    assert.equal(result, undefined)
    const order = ['a', 'b', 'c', 'd', 'e']
    assert.deepEqual(prompts, order.slice(0, order.indexOf(cancelled) + 1))
  })
}
test('cancelling the first operand stops prompts for later operands', async () => {
  const prompts = []
  const result = await convert('a = b + c', { isAlwaysSpecifyObject: true }, {
    requestObjective: async message => { prompts.push(message); return undefined }
  })
  assert.equal(result, undefined)
  assert.deepEqual(prompts, ['formula-to-score-operation.specifying-object:b'])
})
