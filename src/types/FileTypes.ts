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
import { VariableContainer } from './VariableContainer';

export type FileType =
    | 'advancement'
    | 'dimension'
    | 'dimension_type'
    | 'function'
    | 'loot_table'
    | 'predicate'
    | 'recipe'
    | 'structure'
    | 'tag/block'
    | 'tag/entity_type'
    | 'tag/fluid'
    | 'tag/function'
    | 'tag/item'
    | 'worldgen/biome'
    | 'worldgen/configured_carver'
    | 'worldgen/configured_decorator'
    | 'worldgen/configured_feature'
    | 'worldgen/configured_structure_feature'
    | 'worldgen/configured_surface_builder'
    | 'worldgen/noise_settings'
    | 'worldgen/processor_list'
    | 'worldgen/template_pool';

export const fileTypeFolderName: VariableContainer = {
    // common
    advancement: 'advancements',
    dimension: 'dimension',
    dimension_type: 'dimension_type',
    function: 'functions',
    loot_table: 'loot_tables',
    predicate: 'predicates',
    recipe: 'recipes',
    structure: 'structures',
    // tag
    'tag/block': 'tags/blocks',
    'tag/entity_type': 'tags/entity_types',
    'tag/fluid': 'tags/fluids',
    'tag/function': 'tags/functions',
    'tag/item': 'tags/items',
    // worldgen
    'worldgen/biome': 'worldgen/biome',
    'worldgen/configured_carver': 'worldgen/configured_carver',
    'worldgen/configured_decorator': 'worldgen/configured_decorator',
    'worldgen/configured_feature': 'worldgen/configured_feature',
    'worldgen/configured_structure_feature': 'worldgen/configured_structure_feature',
    'worldgen/configured_surface_builder': 'worldgen/configured_surface_builder',
    'worldgen/noise_settings': 'worldgen/noise_settings',
    'worldgen/processor_list': 'worldgen/processor_list',
    'worldgen/template_pool': 'worldgen/template_pool'
};

export const fileTypePaths: Record<FileType, string> = {
    // common
    advancement: 'data/*/advancements/**',
    dimension: 'data/*/dimension/**',
    dimension_type: 'data/*/dimension_type/**',
    function: 'data/*/functions/**',
    loot_table: 'data/*/loot_tables/**',
    predicate: 'data/*/predicates/**',
    recipe: 'data/*/recipes/**',
    structure: 'data/*/structures/**/*.nbt',
    // tag
    'tag/block': 'data/*/tags/blocks/**',
    'tag/entity_type': 'data/*/tags/entity_types/**',
    'tag/fluid': 'data/*/tags/fluids/**',
    'tag/function': 'data/*/tags/functions/**',
    'tag/item': 'data/*/tags/items/**',
    // worldgen
    'worldgen/biome': 'data/*/worldgen/biome/**',
    'worldgen/configured_carver': 'data/*/worldgen/configured_carver/**',
    'worldgen/configured_decorator': 'data/*/worldgen/configured_decorator/**',
    'worldgen/configured_feature': 'data/*/worldgen/configured_feature/**',
    'worldgen/configured_structure_feature': 'data/*/worldgen/configured_structure_feature/**',
    'worldgen/configured_surface_builder': 'data/*/worldgen/configured_surface_builder/**',
    'worldgen/noise_settings': 'data/*/worldgen/noise_settings/**',
    'worldgen/processor_list': 'data/*/worldgen/processor_list/**',
    'worldgen/template_pool': 'data/*/worldgen/template_pool/**'
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
