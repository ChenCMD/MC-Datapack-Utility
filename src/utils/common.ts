/* eslint-disable @typescript-eslint/naming-convention */
import * as path from 'path';
import * as file from './file';
import minimatch from 'minimatch';
import { window } from 'vscode';
import { locale } from '../locales';

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
const fileTypePaths: Record<FileType, string> = {
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

export async function showInputBox(message?: string, validateInput?: (value: string) => string | Thenable<string | null | undefined> | null | undefined): Promise<string | undefined> {
    return await window.showInputBox({
        value: message ? locale('input-here', message) : '',
        placeHolder: '',
        prompt: message ? locale('input-here', message) : '',
        ignoreFocusOut: true,
        validateInput: validateInput
    });
}

/**
 * ファイルの種類を取得します
 * @param filePath 取得したいファイルのファイルパス
 * @param datapackRoot データパックのルートパス
 */
export function getFileType(filePath: string, datapackRoot: string): FileType | null {
    const dir = path.relative(datapackRoot, filePath).replace(/(\\|$)/g, '/');
    for (const type of Object.keys(fileTypePaths) as FileType[]) {
        if (minimatch(dir, fileTypePaths[type]))
            return type;
    }
    return null;
}

/**
 * リソースパスを取得します
 * @param filePath 取得したいファイルのファイルパス
 * @param datapackRoot データパックのルートパス
 */
export function getResourcePath(filePath: string, datapackRoot: string): string {
    return path.relative(datapackRoot, filePath).replace(/\\/g, '/').replace(/^data\/([^/]*)\/[^/]*\/(.*)\.(?:mcfunction|json)$/, '$1:$2');
}

/**
 * ファイルのテンプレートを取得します
 * @param fileType ファイルの種類
 * @param fileName ファイル名
 * @deprecated 開発段階のため実装が大幅に変わる可能性があります
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getFileTemplate(fileType: FileType, fileName: string): Promise<Uint8Array> {
    switch (fileType) {
        // TODO load config template
        default:
            return new Uint8Array();
    }
}

/**
 * データパックのルートパスを取得します
 * @param filePath 取得したいファイルのファイルパス
 * @returns データパック内ではなかった場合undefinedを返します
 */
export async function getDatapackRoot(filePath: string): Promise<string | undefined> {
    if (filePath === path.dirname(filePath))
        return undefined;
    if (await isDatapackRoot(filePath))
        return filePath;
    return getDatapackRoot(path.dirname(filePath));
}

export async function isDatapackRoot(testPath: string): Promise<boolean> {
    return await file.pathAccessible(path.join(testPath, 'pack.mcmeta')) && await file.pathAccessible(path.join(testPath, 'data'));
}