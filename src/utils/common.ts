import * as path from 'path'
import { locale } from '../locales'
import dateFormat from 'dateformat'
import { FileType, getFilePath, getFileType } from '../types/FileTypes'
import { DownloadTimeOutError } from '../types/Error'
import { pathAccessible, readFile } from '.'

export const mod = (n: number, m:number): number => (n % m + m) % m

export const parseRadixFloat = (str: string, radix = 10): number => {
  const radixChars = getRadixChars(radix)
  const [, intParts, floatParts] = new RegExp(`^([${radixChars}]*)(?:\\.([${radixChars}]*))?`).exec(str) ?? []
  const intRes = parseInt(intParts, radix)
  if (floatParts === '') return intRes
  let floatRes = 0
  let divisor = 1
  for (const digit of (floatParts ?? '').split('')) floatRes += parseInt(digit, radix) / (divisor *= radix)
  console.log(intParts, intRes, floatParts, floatRes)
  return intRes + floatRes
}

export const getRadixRegExp = (radix: number, allowFloat: boolean): RegExp => new RegExp(`^(\\+|-)?[${allowFloat ? '.' : ''}${getRadixChars(radix)}${getRadixChars(radix).toUpperCase()}]+$`)

const getRadixChars = (radix: number): string => {
  const radixStrings = '0123456789abcdefghijklmnopqrstuvwxyz'
  return radixStrings.slice(0, radix)
}

export const setTimeOut = async (millisecond: number): Promise<never> =>
  // eslint-disable-next-line brace-style
   await new Promise((_, reject) => setTimeout(
    () => reject(new DownloadTimeOutError(locale('error.download-timeout'))),
    millisecond
  ))


export const getDate = (format: string): string => dateFormat(Date.now(), format)

/**
 * リソースパスを取得します
 * @param filePath 取得したいファイルのファイルパス
 * @param datapackRoot データパックのルートパス
 */
export const getResourcePath = (filePath: string, datapackRoot: string, packFormat: number, fileType?: FileType): string => {
  const fileTypePath = getFilePath(fileType ?? getFileType(path.dirname(filePath), datapackRoot, packFormat), packFormat) ?? '[^/]+'
  return path.relative(datapackRoot, filePath).replace(/\\/g, '/').replace(RegExp(`^data/([^/]+)/${fileTypePath}/(.*)\\.(?:mcfunction|json)$`), '$1:$2')
}

/**
 * 名前空間を取得します
 * @param filePath 取得したいファイルのファイルパス
 * @param datapackRoot データパックのルートパス
 */
export const getNamespace = (filePath: string, datapackRoot: string): string => path.relative(datapackRoot, filePath).replace(/\\/g, '/').replace(/^data\/([^/]+)\/.*$/, '$1')

/**
 * データパックのルートパスを取得します
 * @param filePath 取得したいファイルのファイルパス
 * @returns データパック内ではなかった場合undefinedを返します
 */
export async function getDatapackRoot(filePath: string): Promise<string | undefined> {
  if (filePath === path.dirname(filePath))
    return undefined
  if (await isDatapackRoot(filePath))
    return filePath
  return getDatapackRoot(path.dirname(filePath))
}

export const getPackFormat = async (datapackRoot: string): Promise<number> => {
  const packMcMetaPath = path.join(datapackRoot, 'pack.mcmeta')
  if (!await pathAccessible(packMcMetaPath))
    return 7
  const packMcMeta = JSON.parse(await readFile(packMcMetaPath))
  const pf = packMcMeta.pack.pack_format
  return pf
}

export const isDatapackRoot = async (testPath: string): Promise<boolean> => await pathAccessible(path.join(testPath, 'pack.mcmeta')) && await pathAccessible(path.join(testPath, 'data'))
