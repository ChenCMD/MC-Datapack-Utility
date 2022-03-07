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

import * as path from 'path';
import minimatch from 'minimatch';

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
    | 'tag/worldgen/biome'
    | 'tag/worldgen/configured_carver'
    | 'tag/worldgen/configured_decorator'
    | 'tag/worldgen/configured_feature'
    | 'tag/worldgen/configured_structure_feature'
    | 'tag/worldgen/configured_surface_builder'
    | 'tag/worldgen/density_function'
    | 'tag/worldgen/noise'
    | 'tag/worldgen/noise_settings'
    | 'tag/worldgen/placed_feature'
    | 'tag/worldgen/processor_list'
    | 'tag/worldgen/structure_set'
    | 'tag/worldgen/template_pool'
    | 'worldgen/biome'
    | 'worldgen/configured_carver'
    | 'worldgen/configured_decorator'
    | 'worldgen/configured_feature'
    | 'worldgen/configured_structure_feature'
    | 'worldgen/configured_surface_builder'
    | 'worldgen/density_function'
    | 'worldgen/noise'
    | 'worldgen/noise_settings'
    | 'worldgen/placed_feature'
    | 'worldgen/processor_list'
    | 'worldgen/structure_set'
    | 'worldgen/template_pool';

export const fileTypeFolderName: { [key in FileType]: string } = {
    // common
    advancement: 'advancements',
    dimension: 'dimension',
    dimension_type: 'dimension_type',
    function: 'functions',
    item_modifier: 'item_modifiers',
    loot_table: 'loot_tables',
    predicate: 'predicates',
    recipe: 'recipes',
    structure: 'structures',
    // tag
    'tag/block': 'tags/blocks',
    'tag/entity_type': 'tags/entity_types',
    'tag/fluid': 'tags/fluids',
    'tag/function': 'tags/functions',
    'tag/game_event': 'tags/game_event',
    'tag/item': 'tags/items',
    // tag/worldgen
    'tag/worldgen/biome': 'tags/worldgen/biome',
    'tag/worldgen/configured_carver': 'tags/worldgen/configured_carver',
    'tag/worldgen/configured_decorator': 'tags/worldgen/configured_decorator',
    'tag/worldgen/configured_feature': 'tags/worldgen/configured_feature',
    'tag/worldgen/configured_structure_feature': 'tags/worldgen/configured_structure_feature',
    'tag/worldgen/configured_surface_builder': 'tags/worldgen/configured_surface_builder',
    'tag/worldgen/density_function': 'tags/worldgen/density_function',
    'tag/worldgen/noise': 'tags/worldgen/noise',
    'tag/worldgen/noise_settings': 'tags/worldgen/noise_settings',
    'tag/worldgen/placed_feature': 'tags/worldgen/placed_feature',
    'tag/worldgen/processor_list': 'tags/worldgen/processor_list',
    'tag/worldgen/structure_set': 'tags/worldgen/structure_set',
    'tag/worldgen/template_pool': 'tags/worldgen/template_pool',
    // worldgen
    'worldgen/biome': 'worldgen/biome',
    'worldgen/configured_carver': 'worldgen/configured_carver',
    'worldgen/configured_decorator': 'worldgen/configured_decorator',
    'worldgen/configured_feature': 'worldgen/configured_feature',
    'worldgen/configured_structure_feature': 'worldgen/configured_structure_feature',
    'worldgen/configured_surface_builder': 'worldgen/configured_surface_builder',
    'worldgen/density_function': 'worldgen/density_function',
    'worldgen/noise': 'worldgen/noise',
    'worldgen/noise_settings': 'worldgen/noise_settings',
    'worldgen/placed_feature': 'worldgen/placed_feature',
    'worldgen/processor_list': 'worldgen/processor_list',
    'worldgen/structure_set': 'worldgen/structure_set',
    'worldgen/template_pool': 'worldgen/template_pool'
};

export const fileTypePaths: Record<FileType, string> = {
    // common
    advancement: 'data/*/advancements/**/*.json',
    dimension: 'data/*/dimension/**/*.json',
    dimension_type: 'data/*/dimension_type/**/*.json',
    function: 'data/*/functions/**/*.mcfunction',
    item_modifier: 'data/*/item_modifiers/**/*.json',
    loot_table: 'data/*/loot_tables/**/*.json',
    predicate: 'data/*/predicates/**/*.json',
    recipe: 'data/*/recipes/**/*.json',
    structure: 'data/*/structures/**/*.nbt',
    // tag
    'tag/block': 'data/*/tags/blocks/**/*.json',
    'tag/entity_type': 'data/*/tags/entity_types/**/*.json',
    'tag/fluid': 'data/*/tags/fluids/**/*.json',
    'tag/function': 'data/*/tags/functions/**/*.json',
    'tag/game_event': 'data/*/tags/game_events/**/*.json',
    'tag/item': 'data/*/tags/items/**/*.json',
    // tag/worldgen
    'tag/worldgen/biome': 'data/*/tags/worldgen/biome/**/*.json',
    'tag/worldgen/configured_carver': 'data/*/tags/worldgen/configured_carver/**/*.json',
    'tag/worldgen/configured_decorator': 'data/*/tags/worldgen/configured_decorator/**/*.json',
    'tag/worldgen/configured_feature': 'data/*/tags/worldgen/configured_feature/**/*.json',
    'tag/worldgen/configured_structure_feature': 'data/*/tags/worldgen/configured_structure_feature/**/*.json',
    'tag/worldgen/configured_surface_builder': 'data/*/tags/worldgen/configured_surface_builder/**/*.json',
    'tag/worldgen/density_function': 'data/*/tags/worldgen/density_function/**/*.json',
    'tag/worldgen/noise': 'data/*/tags/worldgen/noise/**/*.json',
    'tag/worldgen/noise_settings': 'data/*/tags/worldgen/noise_settings/**/*.json',
    'tag/worldgen/placed_feature': 'data/*/tags/worldgen/placed_feature/**/*.json',
    'tag/worldgen/processor_list': 'data/*/tags/worldgen/processor_list/**/*.json',
    'tag/worldgen/structure_set': 'data/*/tags/worldgen/structure_set/**/*.json',
    'tag/worldgen/template_pool': 'data/*/tags/worldgen/template_pool/**/*.json',
    // worldgen
    'worldgen/biome': 'data/*/worldgen/biome/**/*.json',
    'worldgen/configured_carver': 'data/*/worldgen/configured_carver/**/*.json',
    'worldgen/configured_decorator': 'data/*/worldgen/configured_decorator/**/*.json',
    'worldgen/configured_feature': 'data/*/worldgen/configured_feature/**/*.json',
    'worldgen/configured_structure_feature': 'data/*/worldgen/configured_structure_feature/**/*.json',
    'worldgen/configured_surface_builder': 'data/*/worldgen/configured_surface_builder/**/*.json',
    'worldgen/density_function': 'data/*/worldgen/density_function/**/*.json',
    'worldgen/noise': 'data/*/worldgen/noise/**/*.json',
    'worldgen/noise_settings': 'data/*/worldgen/noise_settings/**/*.json',
    'worldgen/placed_feature': 'data/*/worldgen/placed_feature/**/*.json',
    'worldgen/processor_list': 'data/*/worldgen/processor_list/**/*.json',
    'worldgen/structure_set': 'data/*/worldgen/structure_set/**/*.json',
    'worldgen/template_pool': 'data/*/worldgen/template_pool/**/*.json'
};

/**
 * ファイルの種類を取得します
 * @param filePath 取得したいファイルのファイルパス
 * @param datapackRoot データパックのルートパス
 */
export function getFileType(filePath: string, datapackRoot: string): FileType | undefined {
    const dir = path.relative(datapackRoot, filePath).replace(/(\\|$)/g, '/');
    for (const type of Object.keys(fileTypePaths) as FileType[]) {
        if (minimatch(dir, fileTypePaths[type]))
            return type;
    }
    return undefined;
}

export function getFilePath(fileType: FileType | undefined): string | undefined {
    if (!fileType) return undefined;
    return fileTypeFolderName[fileType];
}