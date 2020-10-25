import * as path from 'path';
import * as file from './file';
import { window } from 'vscode';
import { locale } from '../locales';
import dateFormat from 'dateformat';
import { config } from '../extension';

export async function showInputBox(message?: string, validateInput?: (value: string) => string | Thenable<string | null | undefined> | null | undefined): Promise<string | undefined> {
    return await window.showInputBox({
        value: message ? locale('input-here', message) : '',
        placeHolder: '',
        prompt: message ? locale('input-here', message) : '',
        ignoreFocusOut: true,
        validateInput: validateInput
    });
}

export function getDate(): string {
    return dateFormat(Date.now(), config.dateFormat);
}

/**
 * リソースパスを取得します
 * @param filePath 取得したいファイルのファイルパス
 * @param datapackRoot データパックのルートパス
 */
export function getResourcePath(filePath: string, datapackRoot: string): string {
    return path.relative(datapackRoot, filePath).replace(/\\/g, '/').replace(/^data\/([^/]+)\/[^/]+\/(.*)\.(?:mcfunction|json)$/, '$1:$2');
}

/**
 * 名前空間を取得します
 * @param filePath 取得したいファイルのファイルパス
 * @param datapackRoot データパックのルートパス
 */
export function getNamespace(filePath: string, datapackRoot: string): string {
    return path.relative(datapackRoot, filePath).replace(/\\/g, '/').replace(/^data\/([^/]+)\/.*$/, '$1');
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