import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'
import { executeScores } from '../tests/helpers/scoreboard.cjs'

test('malformed function arguments terminate with a parser error', () => {
  const expressions = ['a = if( ( b > 1 ) )', 'a = if( b > 1 )',
    'a = if( b > 1 , 2 )', 'a = if( b > 1 , 2 , 3 , 4 )',
    'a = if( , 2 , 3 )', 'a = if( b > 1 , , 3 )', 'a = if( b > 1 , 2 , )',
    'a = if( b > 1 , 2 , 3', 'a = if( b > 1 , ( 2 + 3 , 4 ) )',
    'a = if( b > 1 , 2 , 3 ) )', 'a = 1 +']
  const source = `
    import assert from 'node:assert/strict';
    import { bundledExports } from './scripts/test-helpers.mjs';
    const { createFormulaAnalyzer } = await bundledExports('src/commands/scoreOperation/core/formula.ts');
    const { opTable } = await bundledExports('src/commands/scoreOperation/types/OperateTable.ts');
    const { formulaAnalyzer } = createFormulaAnalyzer({ locale: key => key });
    for (const expression of ${JSON.stringify(expressions)}) {
      assert.throws(() => formulaAnalyzer(expression.split(' '), opTable, [], 1),
        error => ['GenerateError', 'ParsingError'].includes(error.name), expression);
    }
  `
  // The parser is synchronous: a test-runner timeout cannot interrupt an
  // infinite loop. Kill an isolated child process instead.
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 5000
  })
  assert.equal(result.error, undefined, 'parser must finish before the process deadline')
  assert.equal(result.status, 0, result.stderr)
})

const { createFormulaAnalyzer } = await bundledExports('src/commands/scoreOperation/core/formula.ts')
const { createScoreConverter } = await bundledExports('src/commands/scoreOperation/core/converter.ts')
const { opTable } = await bundledExports('src/commands/scoreOperation/types/OperateTable.ts')
const config = { prefix: '$MCDUtil_', objective: '_', temp: 'Temp_', valueScale: 1, isAlwaysSpecifyObject: false }
const ports = { locale: key => key, requestObjective: async () => undefined, warn: () => {} }
async function convert(expression, operators = opTable) {
  const funcs = []
  const formula = createFormulaAnalyzer(ports).formulaAnalyzer(expression.split(' '), operators, funcs, 1)
  return createScoreConverter(ports).rpnToScoreOperation(formula, config, funcs, operators)
}
test('parenthesized branches remain valid', async () => {
  const result = await convert('a = if( b > 1 , ( 2 + 3 ) , ( 4 * 2 ) )')
  for (const b of [0, 2]) assert.equal(executeScores(result, [['b', '_', b]]).get('a _'), b > 1 ? 5 : 8)
})
test('custom functions accept exactly their configured number of arguments', async () => {
  const operators = { ...opTable,
    'sum(': { identifier: 'sum(', type: 'fn', order: 18, assocLow: 'R', arity: 2,
      destination: { args: ['left', 'right'], namely: 'left + right' } },
    'constant(': { identifier: 'constant(', type: 'fn', order: 18, assocLow: 'R', arity: 0,
      destination: { args: [], namely: '1' } },
    'pick(': { identifier: 'pick(', type: 'fn', order: 18, assocLow: 'R', arity: 2,
      destination: { args: [], namely: '1' } }
  }
  assert.equal(executeScores(await convert('a = sum( 2 , 3 )', operators)).get('a _'), 5)
  for (const expression of ['a = constant( )', 'a = constant(  )', 'a = constant( \t )'])
    assert.equal(executeScores(await convert(expression, operators)).get('a _'), 1)
  assert.equal(executeScores(await convert('a = sum( pick( 2 , 3 ) , 4 )', operators)).get('a _'), 5)
  for (const expression of ['a = sum( 2 )', 'a = sum( 2 , 3 , 4 )', 'a = constant( 2 )', 'a = constant( , )',
    'a = pick(  , 3 )', 'a = pick( \t , 3 )'])
    await assert.rejects(convert(expression, operators), /formula-to-score-operation.illegal-formula/)
})
