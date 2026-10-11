import assert from 'node:assert/strict'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'
const { renderFileTemplate } = await bundledExports('src/commands/createFile/core/template.ts')

test('cursor follows expanded variables and uppercase markers are removed', () => {
  assert.deepEqual(renderFileTemplate(['say %fileName% %CURSOR%done'], { fileName: 'sample' }),
    { content: 'say sample done', selection: { line: 0, character: 11 } })
})
test('cursor counts actual line breaks and UTF-16 characters in variable values', () => {
  assert.deepEqual(renderFileTemplate(['header', '%value%%cursor%tail'], { value: 'first\r\n😀\nlast' }),
    { content: 'header\r\nfirst\r\n😀\nlasttail', selection: { line: 3, character: 4 } })
  assert.deepEqual(renderFileTemplate(['%value%%cursor%'], { value: '😀' }),
    { content: '😀', selection: { line: 0, character: 2 } })
})
test('replacement values stay literal and unknown placeholders stay intact', () => {
  assert.deepEqual(renderFileTemplate(['%value%%unknown%%cursor%'], { value: '%CURSOR%$&' }),
    { content: '%CURSOR%$&%unknown%', selection: { line: 0, character: 19 } })
})
test('multiple markers retain the first marker on the last marked template row', () => {
  assert.deepEqual(renderFileTemplate(['a%cursor%b%CURSOR%c', '%name%%Cursor%d%cursor%'], { name: 'sample' }),
    { content: 'abc\r\nsampled', selection: { line: 1, character: 6 } })
})
test('templates without markers have no explicit selection and preserve the input', () => {
  const lines = ['%name%', '']
  assert.deepEqual(renderFileTemplate(lines, { name: 'sample' }), { content: 'sample\r\n', selection: undefined })
  assert.deepEqual(lines, ['%name%', ''])
  assert.deepEqual(renderFileTemplate([], {}), { content: '', selection: undefined })
})
test('literal percent signs cannot hide cursor markers', () => {
  assert.deepEqual(renderFileTemplate(['# 50% %CURSOR%'], {}),
    { content: '# 50% ', selection: { line: 0, character: 6 } })
  assert.deepEqual(renderFileTemplate(['%%cursor%'], {}),
    { content: '%', selection: { line: 0, character: 1 } })
})
test('a variable closing percent cannot also begin a cursor marker', () => {
  assert.deepEqual(renderFileTemplate(['%fileName%cursor%'], { fileName: 'sample' }),
    { content: 'samplecursor%', selection: undefined })
  assert.deepEqual(renderFileTemplate(['%unknown%cursor%%cursor%'], {}),
    { content: '%unknown%cursor%', selection: { line: 0, character: 16 } })
})
test('punctuation outside variable-name characters cannot hide cursor markers', () => {
  assert.deepEqual(renderFileTemplate(['50%,%cursor%'], {}),
    { content: '50%,', selection: { line: 0, character: 4 } })
  assert.deepEqual(renderFileTemplate(['100%/%CURSOR%'], {}),
    { content: '100%/', selection: { line: 0, character: 5 } })
})
test('a literal percent does not prevent a later known variable from expanding', () => {
  assert.deepEqual(renderFileTemplate(['50% %fileName%'], { fileName: 'sample' }),
    { content: '50% sample', selection: undefined })
})
