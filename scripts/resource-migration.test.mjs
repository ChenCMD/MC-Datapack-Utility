import assert from 'node:assert/strict'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'

const { createFileTypeResolver } = await bundledExports('src/core/datapack/fileTypes.ts')
const adapter = await bundledExports('src/types/FileTypes.ts', {
  '../utils/vscodeWrapper': 'export const showError = () => { throw new Error("migration must not warn") }',
  '../locales': 'export const locale = key => key',
  '../utils/uri': 'export const UriUtils = {}'
})
const migrations = [
  ['advancements', 'advancement', 45],
  ['functions', 'function', 45],
  ['item_modifiers', 'item_modifier', 45],
  ['loot_tables', 'loot_table', 45],
  ['predicates', 'predicate', 45],
  ['recipes', 'recipe', 45],
  ['structures', 'structure', 45],
  ['tags/blocks', 'tags/block', 43],
  ['tags/entity_types', 'tags/entity_type', 43],
  ['tags/fluids', 'tags/fluid', 43],
  ['tags/functions', 'tags/function', 45],
  ['tags/game_events', 'tags/game_event', 43],
  ['tags/items', 'tags/item', 43],
  ['worldgen/configured_structure_feature', 'worldgen/structure', 10]
]

for (const [label, migrate] of [
  ['core', createFileTypeResolver().migrateFilePath],
  ['adapter', adapter.migrateFilePath]
]) {
  test(`${label}: resource folders migrate across their metadata boundaries`, () => {
    for (const [legacy, modern, boundary] of migrations) {
      for (const suffix of ['', '/', '/nested/.hidden.json', '/nested/run.mcfunction', '/nested/test.nbt']) {
        const oldPath = `data/%namespace%/${legacy}${suffix}`
        const newPath = `data/%namespace%/${modern}${suffix}`
        assert.equal(migrate(oldPath, boundary), newPath)
        assert.equal(migrate(newPath, boundary - 1), oldPath)
        assert.equal(migrate(oldPath, boundary - 1), oldPath)
        assert.equal(migrate(newPath, boundary), newPath)
      }
    }
  })
  test(`${label}: unavailable types are omitted and unrelated paths stay unchanged`, () => {
    assert.equal(migrate('data/example/dimension/test.json', 4), undefined)
    assert.equal(migrate('data/example/item_modifier/', 6), undefined)
    assert.equal(migrate('data/example/functions/run.mcfunction', 3), undefined)
    for (const format of [3, 9, 45]) {
      const windowsPath = 'data\\example\\functions\\run.mcfunction'
      assert.equal(migrate(windowsPath, format), windowsPath)
    }
    for (const path of ['pack.mcmeta', 'notes/test.txt', 'data/example/custom/test.json', 'data/example/notfunctions/run.mcfunction', 'data\\example\\functions\\run.mcfunction']) {
      assert.equal(migrate(path, 45), path)
    }
  })
}

test('migration does not emit strict classification diagnostics', () => {
  const warnings = []
  const resolver = createFileTypeResolver((type, format) => warnings.push({ type, format }))
  assert.equal(resolver.migrateFilePath('data/example/functions/run.mcfunction', 45), 'data/example/function/run.mcfunction')
  assert.deepEqual(warnings, [])
  assert.equal(resolver.getFileTypeFromRel('data/example/functions/run.mcfunction', 45), undefined)
  assert.deepEqual(warnings, [{ type: 'function', format: 45 }])
})

test('Minecraft 1.18.2 retains configured structure features through pack format 9', () => {
  const resolver = createFileTypeResolver()
  for (const format of [8, 9]) {
    assert.equal(resolver.getFilePath('worldgen/structure', format), 'worldgen/configured_structure_feature')
    assert.equal(resolver.getFileTypeFromRel('data/example/worldgen/configured_structure_feature/test.json', format), 'worldgen/structure')
    assert.equal(resolver.getFileTypeFromRel('data/example/worldgen/structure/test.json', format), undefined)
  }
  assert.equal(resolver.getFilePath('worldgen/structure', 10), 'worldgen/structure')
  assert.equal(resolver.getFileTypeFromRel('data/example/worldgen/structure/test.json', 10), 'worldgen/structure')
  assert.equal(resolver.getFileTypeFromRel('data/example/worldgen/configured_structure_feature/test.json', 10), undefined)
})
