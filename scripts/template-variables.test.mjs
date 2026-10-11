import assert from 'node:assert/strict'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'
const { resolveVars } = await bundledExports('src/core/templates/variables.ts')
const vars = { namespace: 'example', name: 'sample', cursor: '', date: '2026-10-11', nested: '%name%' }
test('known placeholders expand while unknown names and letter case are preserved', () => {
  assert.equal(resolveVars('%namespace%:%name% %cursor% %unknown% %NAME% %date%', vars), 'example:sample  %unknown% %NAME% 2026-10-11')
})
test('replacement values are inserted literally and are not expanded recursively', () => {
  assert.equal(resolveVars('%name% %nested%', { name: '$&', nested: '%name%' }), '$& %name%')
})
test('arrays produce a new array of expanded lines', () => {
  const input = ['say %name%', '%cursor%']
  assert.deepEqual(resolveVars(input, vars), ['say sample', ''])
  assert.deepEqual(input, ['say %name%', '%cursor%'])
})
test('nested JSON values expand in place without replacing keys or scalars', () => {
  const input = { '%name%': '%namespace%', nested: { array: ['%name%', 2, false] } }
  assert.equal(resolveVars(input, vars), input)
  assert.deepEqual(input, { '%name%': 'example', nested: { array: ['sample', 2, false] } })
})
test('root scalar and null values are unchanged', () => {
  for (const value of [3, true, null]) assert.equal(resolveVars(value, vars), value)
})
test('nested null values survive expansion in objects and arrays', () => {
  const input = { value: null, name: '%name%', nested: { value: null },
    array: [null, '%namespace%', { value: null, name: '%name%' }, [null, '%name%']] }
  assert.equal(resolveVars(input, vars), input)
  assert.deepEqual(input, { value: null, name: 'sample', nested: { value: null },
    array: [null, 'example', { value: null, name: 'sample' }, [null, 'sample']] })
})
test('root arrays preserve null while expanding nested JSON objects', () => {
  const input = [null, { value: null, name: '%name%' }]
  const result = resolveVars(input, vars)
  assert.notEqual(result, input)
  assert.equal(result[1], input[1])
  assert.deepEqual(result, [null, { value: null, name: 'sample' }])
})
test('inherited variable names are not substituted', () => {
  assert.equal(resolveVars('%name% %inherited%', Object.assign(Object.create({ inherited: 'hidden' }), { name: 'sample' })), 'sample %inherited%')
})

test('the existing Variables import remains a compatible entry point', async () => {
  const legacy = await bundledExports('src/types/Variables.ts')
  assert.equal(legacy.resolveVars('%namespace%:%name%', vars), resolveVars('%namespace%:%name%', vars))
})
