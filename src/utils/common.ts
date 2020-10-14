/* eslint-disable @typescript-eslint/naming-convention */
import * as path from 'path';
import * as file from './file';
import minimatch from 'minimatch';
import { window } from 'vscode';

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

export async function showInputBox(prompt?: string, validateInput?: (value: string) => string | Thenable<string | null | undefined> | null | undefined): Promise<string | undefined> {
    return await window.showInputBox({
        value: '',
        placeHolder: '',
        prompt: prompt,
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
    return path.relative(datapackRoot, filePath).replace(/\\/g, '/').replace(/^data\/([^/]*)\/[^/]*\/(.*)$/, '$1:$2');
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
    if (isDatapackRoot(filePath))
        return filePath;
    return getDatapackRoot(path.dirname(filePath));
}

export async function isDatapackRoot(testPath: string): Promise<boolean> {
    return await file.pathAccessible(path.join(testPath, 'pack.mcmeta')) && await file.pathAccessible(path.join(testPath, 'data'));
}