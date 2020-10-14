import { Uri, FileSystemError, workspace } from 'vscode';
import { promises as fsp } from 'fs';

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
        workspace.fs.writeFile(filePath instanceof Uri ? filePath : Uri.file(filePath), content);
}

/**
 * ディレクトリを作成します
 * @param dirPath ディレクトリパス
 */
export async function createDir(dirPath: string | Uri): Promise<void> {
    workspace.fs.createDirectory(dirPath instanceof Uri ? dirPath : Uri.file(dirPath));
}

/**
 * パスが存在するか、アクセス可能かを判別します
 * @param testPath 確認するパス
 */
export async function pathAccessible(testPath: string | Uri): Promise<boolean> {
    return fsp.access(testPath instanceof Uri ? testPath.fsPath : testPath)
        .then(() => true)
        .catch(() => false);
}