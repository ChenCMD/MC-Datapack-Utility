import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { context } from 'esbuild'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../', import.meta.url))
const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

// Compile for the extension host supported by VS Code 1.75, not the build Node.
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true })
const build = await context({
  absWorkingDir: root,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node16',
  external: ['vscode'],
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  legalComments: 'external',
  logLevel: 'silent',
  plugins: [{
    name: 'problem-matcher',
    setup(build) {
      build.onStart(() => console.log('[esbuild] build started'))
      build.onEnd(result => {
        for (const diagnostic of [...result.errors, ...result.warnings]) {
          const { location, text } = diagnostic
          const severity = result.errors.includes(diagnostic) ? 'error' : 'warning'
          console.error(location
            ? `${location.file}:${location.line}:${location.column + 1}: ${severity}: ${text}`
            : `${severity}: ${text}`)
        }
        console.log('[esbuild] build finished')
      })
    }
  }]
})

if (watch) {
  const types = spawn(process.execPath, [
    require.resolve('typescript/bin/tsc'), '--noEmit', '--watch', '--preserveWatchOutput'
  ], { cwd: root, stdio: 'inherit' })
  let stopping = false
  const stop = async code => {
    if (stopping) return
    stopping = true
    types.kill()
    await build.dispose()
    process.exit(code)
  }
  types.on('error', error => {
    console.error(error)
    void stop(1)
  })
  types.on('exit', code => { if (!stopping) void stop(code || 1) })
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void stop(0) })
  try {
    await build.watch()
  } catch (error) {
    console.error(error)
    await stop(1)
  }
} else {
  try {
    await build.rebuild()
  } finally {
    await build.dispose()
  }
}
