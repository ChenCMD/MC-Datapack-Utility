/* eslint-disable @typescript-eslint/naming-convention */
/**
 * @license
 * MIT License
 *
 * Copyright (c) 2019-2020 SPGoding
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import * as path from 'path'
import minimatch from 'minimatch'
import { showError } from '../utils'
import { locale } from '../locales'

export const tagFileTypes = [
  'tag/block',
  'tag/entity_type',
  'tag/fluid',
  'tag/function',
  'tag/game_event',
  'tag/item',
  'tag/worldgen/biome',
  'tag/worldgen/configured_carver',
  'tag/worldgen/configured_decorator',
  'tag/worldgen/configured_feature',
  'tag/worldgen/configured_structure_feature',
  'tag/worldgen/configured_surface_builder',
  'tag/worldgen/density_function',
  'tag/worldgen/noise',
  'tag/worldgen/noise_settings',
  'tag/worldgen/placed_feature',
  'tag/worldgen/processor_list',
  'tag/worldgen/structure_set',
  'tag/worldgen/template_pool'
] as const

export type FileType =
  | 'advancement'
  | 'dimension'
  | 'dimension_type'
  | 'function'
  | 'item_modifier'
  | 'loot_table'
  | 'predicate'
  | 'recipe'
  | 'structure'
  | 'tag/block'
  | 'tag/entity_type'
  | 'tag/fluid'
  | 'tag/function'
  | 'tag/game_event'
  | 'tag/item'
  | 'worldgen/biome'
  | 'worldgen/configured_carver'
  | 'worldgen/configured_feature'
  | 'worldgen/configured_surface_builder'
  | 'worldgen/density_function'
  | 'worldgen/flat_level_generator_preset'
  | 'worldgen/multi_noise_biome_source_parameter_list'
  | 'worldgen/noise'
  | 'worldgen/noise_settings'
  | 'worldgen/placed_feature'
  | 'worldgen/processor_list'
  | 'worldgen/structure'
  | 'worldgen/structure_set'
  | 'worldgen/template_pool'
  | 'worldgen/world_preset'
  | 'tag/worldgen/biome'
  | 'tag/worldgen/flat_level_generator_preset'
  | 'tag/worldgen/structure'
  | 'tag/worldgen/world_preset'

type VersionMapping = { version: number | { from: number, to: number }, name: string }
type FileTypeMetaData = { extension: string, versionMappings: VersionMapping[] }

const versions = {
  '17w43a': 4,
  '17w48a': 4,
  '17w49a': 4,
  '17w49b': 4,
  '18w19a': 4,
  '18w43a': 4,
  '19w38a': 4,
  '20w28a': 5,
  '20w29a': 5,
  '1.16-pre1': 5,
  '20w46a': 7,
  '20w49a': 7,
  '21w42a': 8,
  '1.18-pre1': 8,
  '22w07a': 8,
  '1.18.2-pre1': 9,
  '1.18.2': 8,
  '22w11a': 10,
  '1.19.4-pre1': 12,
  '24w18a': 42,
  '24w19a': 43,
  '24w20a': 44,
  '24w21a': 45
}

const fileTypeMetaDataMap: Record<FileType, FileTypeMetaData> = {
  // common
  advancement: { extension: 'json', versionMappings: [{ version: versions['24w21a'], name: 'advancement' }, { version: { from: versions['17w43a'], to: versions['24w20a'] }, name: 'advancements' }] },
  dimension: { extension: 'json', versionMappings: [{ version: versions['1.16-pre1'], name: 'dimension' }] },
  dimension_type: { extension: 'json', versionMappings: [{ version: versions['1.16-pre1'], name: 'dimension_type' }] },
  function: { extension: 'mcfunction', versionMappings: [{ version: versions['24w21a'], name: 'function' }, { version: { from: versions['17w43a'], to: versions['24w20a'] }, name: 'functions' }] },
  item_modifier: { extension: 'json', versionMappings: [{ version: versions['24w21a'], name: 'item_modifier' }, { version: { from: versions['20w46a'], to: versions['24w20a'] }, name: 'item_modifiers' }] },
  loot_table: { extension: 'json', versionMappings: [{ version: versions['24w21a'], name: 'loot_table' }, { version: { from: versions['17w43a'], to: versions['24w20a'] }, name: 'loot_tables' }] },
  predicate: { extension: 'json', versionMappings: [{ version: versions['24w21a'], name: 'predicate' }, { version: { from: versions['19w38a'], to: versions['24w20a'] }, name: 'predicates' }] },
  recipe: { extension: 'json', versionMappings: [{ version: versions['24w21a'], name: 'recipe' }, { version: { from: versions['17w48a'], to: versions['24w20a'] }, name: 'recipes' }] },
  structure: { extension: 'nbt', versionMappings: [{ version: versions['24w21a'], name: 'structure' }, { version: { from: versions['17w43a'], to: versions['24w20a'] }, name: 'structures' }] },
  // tag/common
  'tag/block': { extension: 'json', versionMappings: [{ version: versions['24w19a'], name: 'tags/block' }, { version: { from: versions['17w49a'], to: versions['24w18a'] }, name: 'tags/blocks', }] },
  'tag/entity_type': { extension: 'json', versionMappings: [{ version: versions['24w19a'], name: 'tags/entity_type' }, { version: { from: versions['18w43a'], to: versions['24w18a'] }, name: 'tags/entity_types', }] },
  'tag/fluid': { extension: 'json', versionMappings: [{ version: versions['24w19a'], name: 'tags/fluid' }, { version: { from: versions['18w19a'], to: versions['24w18a'] }, name: 'tags/fluids', }] },
  'tag/function': { extension: 'json', versionMappings: [{ version: versions['24w21a'], name: 'tags/function' }, { version: { from: versions['17w49b'], to: versions['24w20a'] }, name: 'tags/functions', }] },
  'tag/game_event': { extension: 'json', versionMappings: [{ version: versions['24w19a'], name: 'tags/game_event' }, { version: { from: versions['20w49a'], to: versions['24w18a'] }, name: 'tags/game_events', }] },
  'tag/item': { extension: 'json', versionMappings: [{ version: versions['24w19a'], name: 'tags/item' }, { version: { from: versions['17w49a'], to: versions['24w18a'] }, name: 'tags/items', }] },
  // worldgen
  'worldgen/biome': { extension: 'json', versionMappings: [{ version: versions['20w28a'], name: 'worldgen/biome' }] },
  'worldgen/configured_carver': { extension: 'json', versionMappings: [{ version: versions['20w28a'], name: 'worldgen/configured_carver' }] },
  'worldgen/configured_feature': { extension: 'json', versionMappings: [{ version: versions['20w28a'], name: 'worldgen/configured_feature' }] },
  'worldgen/configured_surface_builder': { extension: 'json', versionMappings: [{ version: versions['20w28a'], name: 'worldgen/configured_surface_builder' }] },
  'worldgen/density_function': { extension: 'json', versionMappings: [{ version: versions['1.18.2-pre1'], name: 'worldgen/density_function' }] },
  'worldgen/flat_level_generator_preset': { extension: 'json', versionMappings: [{ version: versions['22w11a'], name: 'worldgen/flat_level_generator_preset' }] },
  'worldgen/multi_noise_biome_source_parameter_list': { extension: 'json', versionMappings: [{ version: versions['1.19.4-pre1'], name: 'worldgen/multi_noise_biome_source_parameter_list' }] },
  'worldgen/noise': { extension: 'json', versionMappings: [{ version: versions['21w42a'], name: 'worldgen/noise' }] },
  'worldgen/noise_settings': { extension: 'json', versionMappings: [{ version: versions['20w29a'], name: 'worldgen/noise_settings' }] },
  'worldgen/placed_feature': { extension: 'json', versionMappings: [{ version: versions['1.18-pre1'], name: 'worldgen/placed_feature' }] },
  'worldgen/processor_list': { extension: 'json', versionMappings: [{ version: versions['20w28a'], name: 'worldgen/processor_list' }] },
  'worldgen/structure': { extension: 'json', versionMappings: [{ version: versions['22w11a'], name: 'worldgen/structure' }, { version: { from: versions['20w28a'], to: versions['1.18.2'] }, name: 'worldgen/configured_structure_feature' }] },
  'worldgen/structure_set': { extension: 'json', versionMappings: [{ version: versions['1.18.2-pre1'], name: 'worldgen/structure_set' }] },
  'worldgen/template_pool': { extension: 'json', versionMappings: [{ version: versions['20w28a'], name: 'worldgen/template_pool' }] },
  'worldgen/world_preset': { extension: 'json', versionMappings: [{ version: versions['22w11a'], name: 'worldgen/world_preset' }] },
  // tag/worldgen
  'tag/worldgen/biome': { extension: 'json', versionMappings: [{ version: versions['22w07a'], name: 'tags/worldgen/biome' }] },
  'tag/worldgen/flat_level_generator_preset': { extension: 'json', versionMappings: [{ version: versions['22w11a'], name: 'tags/worldgen/flat_level_generator_preset' }] },
  'tag/worldgen/structure': { extension: 'json', versionMappings: [{ version: versions['22w11a'], name: 'tags/worldgen/structure' }] },
  'tag/worldgen/world_preset': { extension: 'json', versionMappings: [{ version: versions['22w11a'], name: 'tags/worldgen/world_preset' }] },
}

function isIncludeVersion(version: VersionMapping, packFormat: number): boolean {
  return (typeof version.version === 'number')
    ? version.version <= packFormat
    : version.version.from <= packFormat && packFormat <= version.version.to
}

function getFileTypeFromRel(relativePath: string, packFormat: number): FileType | undefined {
  const [matchedFileType, matchedFileTypeMetaData] = (Object.entries(fileTypeMetaDataMap) as [FileType, FileTypeMetaData][])
    .find(([, metaData]) => metaData.versionMappings.some(v => minimatch(relativePath, `data/*/${v.name}/**`, { dot: true })))
    ?? [undefined, undefined]

  if (!matchedFileType)
    return undefined

  const currentVersion = matchedFileTypeMetaData.versionMappings.find(v => minimatch(relativePath, `data/*/${v.name}/**`, { dot: true }))
  const targetVersion = matchedFileTypeMetaData.versionMappings.find(v => isIncludeVersion(v, packFormat))
  if (!currentVersion || !targetVersion || currentVersion.name !== targetVersion.name) {
    showError(locale('maybe-wrong-pack-format', { fileType: matchedFileType, packFormat }))
    return undefined
  }

  return matchedFileType
}

/**
 * ファイルの種類を取得します
 * @param filePath 取得したいファイルのファイルパス
 * @param datapackRoot データパックのルートパス
 */
export function getFileType(filePath: string, datapackRoot: string, packFormat: number): FileType | undefined {
  const dir = path.relative(datapackRoot, filePath).replace(/(\\|$)/g, '/')
  return getFileTypeFromRel(dir, packFormat)
}

export function getFilePath(fileType: FileType | undefined, packFormat: number): string | undefined {
  if (!fileType) return undefined
  return fileTypeMetaDataMap[fileType].versionMappings.find(v => isIncludeVersion(v, packFormat))?.name
}

export function migrateFilePath(relativePath: string, packFormat: number): string | undefined {
  const fileType = getFileTypeFromRel(relativePath, packFormat)
  if (!fileType) return relativePath

  const metaData = fileTypeMetaDataMap[fileType]

  const currentVersion = metaData.versionMappings.find(v => minimatch(relativePath, `data/*/${v.name}/**`, { dot: true }))
  if (!currentVersion) return relativePath

  const targetVersion = metaData.versionMappings.find(v => isIncludeVersion(v, packFormat))
  if (!targetVersion) return undefined

  return relativePath.replace(RegExp(`data/([^/]+)/${currentVersion.name}/(.*)`), `data/$1/${targetVersion.name}/$2`)
}
