import * as path from 'path';
import * as file from './file';
import { locale } from '../locales';
import dateFormat from 'dateformat';
import { FileType, getFilePath, getFileType } from '../types/FileTypes';
import { DownloadTimeOutError } from '../types/Error';
import { Uri } from 'vscode';

export function flatPath(pathOrUri: string | Uri): Uri {
    return pathOrUri instanceof Uri ? pathOrUri : Uri.file(pathOrUri);
}

export async function setTimeOut(milisec: number): Promise<never> {
    // eslint-disable-next-line brace-style
    return await new Promise((_, reject) => setTimeout(
        () => reject(new DownloadTimeOutError(locale('error.download-timeout'))),
        milisec
    ));
}

export function getDate(format: string): string {
    return dateFormat(Date.now(), format);
}

/**
 * リソースパスを取得します
 * @param filePath 取得したいファイルのファイルパス
 * @param datapackRoot データパックのルートパス
 */
export function getResourcePath(filePath: string, datapackRoot: string, fileType?: FileType): string {
    const fileTypePath = getFilePath(fileType ?? getFileType(filePath, datapackRoot)) ?? '[^/]+';
    return path.relative(datapackRoot, filePath).replace(/\\/g, '/').replace(RegExp(`^data/([^/]+)/${fileTypePath}/(.*)\\.(?:mcfunction|json)$`), '$1:$2');
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