import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'

test('all locale JSON files load from a minified CommonJS bundle', async () => {
  const { loadLocale, locale } = await bundledExports('src/locales/index.ts', {
    '../extension': 'export const codeConsole = { appendLine() {} }'
  })
  for (const language of ['en', 'ja', 'zh-cn', 'zh-tw']) {
    const expected = JSON.parse(await readFile(new URL(`../src/locales/${language}.json`, import.meta.url)))
    await loadLocale(language, 'en')
    assert.equal(locale('day-name.sunday'), expected['day-name.sunday'], language)
  }
})

test('expression replacement retains its behavior after bundling and minification', async () => {
  const { expressionReplacer } = await bundledExports('src/commands/multiLineGenerator/replacer/expression.ts', {
    '../../../locales': 'export const locale = key => key',
    '../../../types': 'export class ParsingError extends Error {}',
    '../../../utils': `
      const answers = ['y = 2x + 1', '-1'];
      export const listenInput = async () => answers.shift();
      export const numberValidator = () => true;
      export const stringValidator = () => true;
    `
  })
  assert.deepEqual(await expressionReplacer('value=%r', 3), ['value=3', 'value=5', 'value=7'])
})
