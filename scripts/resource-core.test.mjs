import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'
const { createFileTypeResolver } = await bundledExports('src/core/datapack/fileTypes.ts')
const { resourcePathFromRelative, namespaceFromRelative } = await bundledExports('src/core/datapack/resourcePaths.ts')
const resolver = createFileTypeResolver()
const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures/resource-paths.json', import.meta.url)))
for (const fixture of fixtures) {
  test(`resource core: ${fixture.name}`, () => {
    const normalized = fixture.path.replace(/(\\|$)/g, '/')
    const type = resolver.getFileTypeFromRel(normalized, fixture.packFormat)
    assert.equal(type, fixture.type ?? undefined)
    assert.equal(resourcePathFromRelative(fixture.path, fixture.packFormat, type), fixture.resource)
    assert.equal(namespaceFromRelative(fixture.path), fixture.namespace)
    assert.equal(resolver.migrateFilePath(fixture.path, fixture.packFormat), fixture.migrated)
  })
}
test('format mismatch reports one diagnostic while unknown directories do not report', () => {
  const warnings = []
  const resolver = createFileTypeResolver((fileType, packFormat) => warnings.push({ fileType, packFormat }))
  assert.equal(resolver.getFileTypeFromRel('data/example/functions/run.mcfunction', 45), undefined)
  assert.equal(resolver.getFileTypeFromRel('data/example/custom/run.json', 45), undefined)
  assert.deepEqual(warnings, [{ fileType: 'function', packFormat: 45 }])
})
