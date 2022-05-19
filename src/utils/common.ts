import * as path from 'path';
import { locale } from '../locales';
import dateFormat from 'dateformat';
import { FileType, getFilePath, getFileType } from '../types/FileTypes';
import { DownloadTimeOutError } from '../types/Error';
import { pathAccessible } from '.';

export function mod(n: number, m:number): number {
    return (n % m + m) % m;
}

export function parseRadixFloat(str: string, radix = 10): number {
    const radixChars = getRadixChars(radix);
    const [, intParts, floatParts] = new RegExp(`^([${radixChars}]*)(?:\\.([${radixChars}]*))?`).exec(str) ?? [];
    const intRes = parseInt(intParts, radix);
    if (floatParts === '') return intRes;
    let floatRes = 0;
    let divisor = 1;
    for (const digit of (floatParts ?? '').split('')) floatRes += parseInt(digit, radix) / (divisor *= radix);
    console.log(intParts, intRes, floatParts, floatRes);
    return intRes + floatRes;
}

export function getRadixRegExp(radix: number, allowFloat: boolean): RegExp {
    return new RegExp(`^(\\+|-)?[${allowFloat ? '.' : ''}${getRadixChars(radix)}${getRadixChars(radix).toUpperCase()}]+$`);
}

function getRadixChars(radix: number): string {
    const radixStrings = '0123456789abcdefghijklmnopqrstuvwxyz';
    return radixStrings.slice(0, radix);
}

export async function setTimeOut(millisecond: number): Promise<never> {
    // eslint-disable-next-line brace-style
    return await new Promise((_, reject) => setTimeout(
        () => reject(new DownloadTimeOutError(locale('error.download-timeout'))),
        millisecond
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
    const fileTypePath = getFilePath(fileType ?? getFileType(path.dirname(filePath), datapackRoot)) ?? '[^/]+';
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
    return await pathAccessible(path.join(testPath, 'pack.mcmeta')) && await pathAccessible(path.join(testPath, 'data'));
}