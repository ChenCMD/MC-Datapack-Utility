import assert from 'node:assert/strict'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'
import { executeScores } from '../tests/helpers/scoreboard.cjs'

const { createFormulaAnalyzer } = await bundledExports('src/commands/scoreOperation/core/formula.ts')
const { createScoreConverter } = await bundledExports('src/commands/scoreOperation/core/converter.ts')
const { createOperateTable } = await bundledExports('src/commands/scoreOperation/core/operateTable.ts')
const { opTable } = await bundledExports('src/commands/scoreOperation/types/OperateTable.ts')
const ports = { locale: (key, ...params) => [key, ...params].join(':'), requestObjective: async () => undefined, warn: () => {} }
const config = { prefix: '$MCDUtil_', objective: '_', temp: 'Temp_', valueScale: 1, isAlwaysSpecifyObject: false }
const analyze = (expression, operators = opTable, funcs = [], scale = 1) =>
  createFormulaAnalyzer(ports).formulaAnalyzer(expression.split(' '), operators, funcs, scale)
async function convert(expression, valueScale = 1) {
  const funcs = []
  const formula = analyze(expression, opTable, funcs, valueScale)
  return createScoreConverter(ports).rpnToScoreOperation(formula, { ...config, valueScale }, funcs, opTable)
}

for (const name of ['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__', 'isPrototypeOf', 'propertyIsEnumerable']) {
  test(`prototype property ${name} remains a source and destination score name`, async () => {
    assert.equal(executeScores(await convert(`${name} = 2`)).get(`${name} _`), 2)
    assert.equal(executeScores(await convert(`a = ${name} + 1`), [[name, '_', 4]]).get('a _'), 5)
    assert.equal(executeScores(await convert(`( ${name} ) += 2`, 10), [[name, '_', 4]]).get(`${name} _`), 24)
    assert.equal(executeScores(await convert(`a = - ${name} + 1`, 10), [[name, '_', 4]]).get('a _'), -30)
  })
  test(`prototype property ${name} remains an operand on either side of a condition`, async () => {
    for (const expression of [`a = if( ${name} > 1 , ${name} , 3 )`, `a = if( 1 < ${name} , ${name} , 3 )`]) {
      const result = await convert(expression)
      for (const value of [0, 2])
        assert.equal(executeScores(result, [[name, '_', value]]).get('a _'), value > 1 ? value : 3)
    }
  })
  test(`unregistered operator ${name} reports a localized missing-operator error`, () => {
    assert.throws(() => analyze(`a ${name} b`), error =>
      error.name === 'GenerateError' && error.message === `error.not-exist:operator:${name}`)
  })
}

test('own custom operator entries remain recognized even when named like prototype properties', () => {
  for (const name of ['toString', '__proto__']) {
    const operator = { ...opTable['+'], identifier: name }
    const operators = createOperateTable([operator])
    assert.equal(Object.prototype.hasOwnProperty.call(operators, name), true)
    assert.equal(Object.getPrototypeOf(operators), Object.prototype)
    assert.deepEqual(analyze(`left ${name} right`, operators), { front: 'left', op: operator, back: 'right' })
  }
})
