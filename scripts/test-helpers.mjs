import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)

export async function bundledExports(entryPoint, stubs = {}) {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node16',
    minify: true,
    keepNames: true,
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

