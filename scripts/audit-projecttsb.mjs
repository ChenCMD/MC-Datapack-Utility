// Explicit online audit. Regular pnpm check uses pinned, offline fixtures.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import ts from 'typescript'
import { bundledExports } from './test-helpers.mjs'
const fixtureUrl = new URL('../tests/fixtures/projecttsb/compatibility.json', import.meta.url)
const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'))
const { createFileTypeResolver } = await bundledExports('src/core/datapack/fileTypes.ts')
const { isRelativeResourceName } = await bundledExports('src/commands/createFile/core/names.ts')
const { isTemplatePath } = await bundledExports('src/commands/createDatapackTemplate/core/paths.ts')
const resolver = createFileTypeResolver()
const refresh = process.argv.includes('--refresh-fixture')
for (const project of fixture.projects) {
  const response = await fetch(`https://api.github.com/repos/${project.repo}/git/trees/${project.commit}?recursive=1`)
  assert.equal(response.ok, true, `Unable to fetch ${project.repo}: ${response.status}`)
  const tree = await response.json()
  assert.equal(tree.truncated, false)
  async function source(name) {
    const result = await fetch(`https://raw.githubusercontent.com/${project.repo}/${project.commit}/${name}`)
    assert.equal(result.ok, true, `Unable to fetch ${project.repo}/${name}: ${result.status}`)
    return result.text()
  }
  assert.ok((await source('LICENSE')).includes('CC0 1.0 Universal'))
  const parsed = ts.parseConfigFileTextToJson('.vscode/settings.json', await source('.vscode/settings.json'))
  assert.equal(parsed.error, undefined)
  const settings = Object.fromEntries(Object.entries(parsed.config).filter(([key]) => key.startsWith('mcdutil.')))
  const packs = []
  for (const entry of tree.tree.filter(item => item.type === 'blob' && /(^|\/)pack\.mcmeta$/.test(item.path))) {
    const metadata = JSON.parse(await source(entry.path))
    assert.ok(Number.isSafeInteger(metadata.pack?.pack_format))
    packs.push({ root: entry.path.slice(0, -'pack.mcmeta'.length).replace(/\/$/, ''), packFormat: metadata.pack.pack_format })
  }
  const audit = { files: 0, resourceFiles: 0, unnamedFunctions: 0, unnamedJSON: 0, rejectedPaths: [], rejectedNames: [], unknownTypes: [] }
  const cases = new Map()
  for (const entry of tree.tree) {
    if (entry.type !== 'blob') continue
    const pack = [...packs].sort((a, b) => b.root.length - a.root.length)
      .find(item => entry.path.startsWith((item.root ? item.root + '/' : '') + 'data/'))
    if (!pack) continue
    const relative = entry.path.slice(pack.root ? pack.root.length + 1 : 0)
    audit.files++
    if (!isTemplatePath(relative, 'file')) audit.rejectedPaths.push(entry.path)
    if (!/\.(json|mcfunction)$/.test(relative)) continue
    audit.resourceFiles++
    if (relative.endsWith('/.mcfunction')) audit.unnamedFunctions++
    if (relative.endsWith('/.json')) audit.unnamedJSON++
    const type = resolver.getFileTypeFromRel(relative + '/', pack.packFormat)
    if (!type) { audit.unknownTypes.push(relative); continue }
    const folder = resolver.getFilePath(type, pack.packFormat), namespace = relative.split('/')[1]
    const prefix = `data/${namespace}/${folder}/`
    assert.ok(relative.startsWith(prefix))
    const resourceName = relative.slice(prefix.length).replace(/\.(json|mcfunction)$/, '')
    if (!isRelativeResourceName(resourceName)) audit.rejectedNames.push(entry.path)
    const unnamed = relative.endsWith('/.mcfunction') || relative.endsWith('/.json')
    const key = [type, namespace, unnamed, /\d/.test(resourceName), /[-.]/.test(resourceName), relative.includes('/data/')].join('|')
    if (!cases.has(key)) cases.set(key, { path: entry.path, relative, type, input: resourceName, resource: namespace + ':' + resourceName, packFormat: pack.packFormat })
  }
  assert.deepEqual(audit.rejectedPaths, []); assert.deepEqual(audit.rejectedNames, []); assert.deepEqual(audit.unknownTypes, [])
  if (refresh) Object.assign(project, { audit, packs, cases: [...cases.values()], settings })
  else {
    assert.deepEqual(project.audit, audit, project.repo + ' audit')
    assert.deepEqual(project.packs, packs, project.repo + ' pack metadata')
    assert.deepEqual(project.cases, [...cases.values()], project.repo + ' representative paths')
    assert.deepEqual(project.settings, settings, project.repo + ' extension settings')
  }
  process.stdout.write(`${project.repo}@${project.commit}: ${audit.resourceFiles} JSON/function paths accepted and classified; ${packs.length} pack formats, settings and license verified\n`)
}
if (refresh) await writeFile(fixtureUrl, JSON.stringify(fixture, null, 2) + '\n')
