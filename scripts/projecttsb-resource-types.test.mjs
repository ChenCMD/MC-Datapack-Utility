import assert from 'node:assert/strict'
import test from 'node:test'
import { bundledExports } from './test-helpers.mjs'
const { createFileTypeResolver } = await bundledExports('src/core/datapack/fileTypes.ts')
const { resourcePathFromRelative } = await bundledExports('src/core/datapack/resourcePaths.ts')
const resolver = createFileTypeResolver()
for (const [type, folder, minimum] of [['tag/damage_type', 'tags/damage_type', 12], ['trim_pattern', 'trim_pattern', 11]]) {
  test(`ProjectTSB resource type ${type} is classified with its complete folder prefix`, () => {
    for (const format of [minimum, 26, 45]) {
      const relative = `data/example/${folder}/nested/.json`
      assert.equal(resolver.getFileTypeFromRel(relative + '/', format), type)
      assert.equal(resourcePathFromRelative(relative, format, type), 'example:nested/')
      assert.equal(resolver.getFilePath(type, format), folder)
    }
    assert.equal(resolver.getFilePath(type, minimum - 1), undefined)
  })
}
