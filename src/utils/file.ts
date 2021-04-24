import { Uri, FileSystemError, workspace } from 'vscode';
import * as fs from 'fs';
// eslint-disable-next-line no-duplicate-imports
import { promises as fsp } from 'fs';
import { flatPath } from './common';
import path from 'path';

/**
 * ファイルを作成します
 * @param filePath ファイルパス
 * @param content 内容
 * @throws FileSystemError ファイルが既に存在する場合
 */
export async function createFile(filePath: string | Uri, content: Uint8Array): Promise<void> {
    if (await pathAccessible(filePath))
        throw FileSystemError.FileExists(filePath);
    else
        await workspace.fs.writeFile(flatPath(filePath), content);
}

/**
 * ディレクトリを作成します
 * @param dirPath ディレクトリパス
 */
export async function createDir(dirPath: string | Uri): Promise<void> {
    await workspace.fs.createDirectory(flatPath(dirPath));
}

/**
 * パスが存在するか、アクセス可能かを判別します
 * @param testPath 確認するパス
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
export async function pathAccessible(testPath: string | Uri): Promise<boolean> {
    return await fsp.access(flatPath(testPath).fsPath)
        .then(() => true)
        .catch(() => false);
}

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
export async function readFile(targetPath: string | Uri): Promise<string> {
    return await new Promise((resolve, reject) => {
        let data = '';
        fs.createReadStream(flatPath(targetPath).fsPath, { encoding: 'utf-8', highWaterMark: 128 * 1024 })
            .on('data', chunk => data += chunk)
            .on('end', () => resolve(data))
            .on('error', reject);
    });
}

export async function writeFile(targetPath: string | Uri, content: string): Promise<void> {
    return await fsp.writeFile(flatPath(targetPath).fsPath, content);
}

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
    workspaceRoot: Uri,
    abs: string,
    cb: (xabs: string, stat: fs.Stats) => void,
    depth = Infinity
): Promise<void> {
    if (depth <= 0) return;

    const promises: Promise<void>[] = [];
    for (const name of await fsp.readdir(abs)) {
        const newAbs = path.join(abs, name);
        const stat = await fsp.stat(newAbs);
        if (stat.isDirectory()) {
            cb(newAbs, stat);
            promises.push(walkRoot(workspaceRoot, newAbs, cb, depth - 1));
        }
    }
    return void Promise.all(promises);
}