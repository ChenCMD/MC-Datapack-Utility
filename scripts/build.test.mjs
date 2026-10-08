import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)

async function bundledExports(entryPoint, stubs) {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node16',
    minify: true,
    write: false,
    logLevel: 'silent',
    plugins: [{
      name: 'test-boundaries',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, args => {
          if (Object.hasOwn(stubs, args.path)) return { path: args.path, namespace: 'stub' }
        })
        builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: stubs[args.path] }))
      }
    }]
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}

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
