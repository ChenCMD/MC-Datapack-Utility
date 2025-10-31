import { Uri, FileSystemError, workspace, FileType } from 'vscode'
import { UriUtils } from './uri'
import { TextDecoder, TextEncoder } from 'util'

/**
 * ファイルを作成します
 * @param fileUri ファイルパス
 * @param content 内容
 * @throws FileSystemError ファイルが既に存在する場合
 */
export const createFile = async (fileUri: Uri, content: Uint8Array): Promise<void> => {
  if (await pathAccessible(fileUri))
    throw FileSystemError.FileExists(fileUri)
  else
    await workspace.fs.writeFile(fileUri, content)
}

/**
 * パスが存在するか、アクセス可能かを判別します
 * @param testUri 確認するパス
 */
export const pathAccessible = async (testUri: Uri): Promise<boolean> =>
  await workspace.fs.stat(testUri)
    .then(() => true, () => false)

export const readFile = async (targetUri: Uri): Promise<string> =>
  await workspace.fs.readFile(targetUri).then(buffer => new TextDecoder().decode(buffer))

export const writeFile = async (targetUri: Uri, content: string): Promise<void> =>
  await workspace.fs.writeFile(targetUri, new TextEncoder().encode(content))

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
export async function walkRoot(
  abs: Uri,
  cb: (abs: Uri) => void,
  depth = Infinity
): Promise<void> {
  if (depth <= 0) return

  const promises: Promise<void>[] = []
  for (const [name, fileType] of await workspace.fs.readDirectory(abs)) {
    const newAbs = UriUtils.joinPath(abs, name)
    if (fileType === FileType.Directory) {
      cb(newAbs)
      promises.push(walkRoot(newAbs, cb, depth - 1))
    }
  }
  return void Promise.all(promises)
}
