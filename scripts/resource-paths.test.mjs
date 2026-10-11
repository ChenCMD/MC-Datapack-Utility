import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'

const boundaries = {
  vscode: 'export const Uri = {}',
  '../utils/vscodeWrapper': 'export const warnings = []; export const showError = message => warnings.push(message)',
  '../locales': 'export const locale = (key, params) => `${key}:${params.fileType}:${params.packFormat}`',
  '../utils/uri': 'export const UriUtils = { relativePath: (_root, uri) => uri.relative, dirname: uri => ({ relative: uri.relative.slice(0, uri.relative.lastIndexOf("/")) }) }',
  './uri': 'export const UriUtils = { relativePath: (_root, uri) => uri.relative, dirname: uri => ({ relative: uri.relative.slice(0, uri.relative.lastIndexOf("/")) }) }',
  '.': 'export const pathAccessible = async () => false; export const readFile = async () => ""'
}
const types = await bundledExports('src/types/FileTypes.ts', boundaries)
const common = await bundledExports('src/utils/common.ts', boundaries)
const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures/resource-paths.json', import.meta.url)))
for (const fixture of fixtures) {
  test(`resource adapter: ${fixture.name}`, () => {
    const uri = { relative: fixture.path }
    assert.equal(types.getFileType(uri, {}, fixture.packFormat), fixture.type ?? undefined)
    assert.equal(common.getResourcePath(uri, {}, fixture.packFormat), fixture.resource)
    assert.equal(common.getNamespace(uri, {}), fixture.namespace)
    assert.equal(types.migrateFilePath(fixture.path, fixture.packFormat), fixture.migrated)
  })
}
test('folder names follow the existing pack-format boundaries', () => {
  assert.equal(types.getFilePath('function', 44), 'functions')
  assert.equal(types.getFilePath('function', 45), 'function')
  assert.equal(types.getFilePath('tag/block', 42), 'tags/blocks')
  assert.equal(types.getFilePath('tag/block', 43), 'tags/block')
  assert.equal(types.getFilePath('dimension', 4), undefined)
  assert.equal(types.getFilePath(undefined, 45), undefined)
})
