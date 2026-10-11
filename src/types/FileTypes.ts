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

import { createFileTypeResolver } from '../core/datapack/fileTypes'
import { showError } from '../utils/vscodeWrapper'
import { locale } from '../locales'
import type { Uri } from 'vscode'
import { UriUtils } from '../utils/uri'

export { tagFileTypes } from '../core/datapack/fileTypes'
export type { FileType } from '../core/datapack/fileTypes'

const resolver = createFileTypeResolver((fileType, packFormat) => {
  showError(locale('maybe-wrong-pack-format', { fileType, packFormat }))
})
export const { getFilePath, migrateFilePath } = resolver

export function getFileType(filePath: Uri, datapackRoot: Uri, packFormat: number) {
  const relative = UriUtils.relativePath(datapackRoot, filePath).replace(/(\\|$)/g, '/')
  return resolver.getFileTypeFromRel(relative, packFormat)
}
