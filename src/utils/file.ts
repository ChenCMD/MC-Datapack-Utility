import { Uri, FileSystemError, workspace } from 'vscode'
import { promises as fsp } from 'fs'

export async function create(filePath: string, content: Uint8Array) {
    if (await pathAccessible(filePath)) {
        throw FileSystemError.FileExists()
    } else {
        workspace.fs.writeFile(Uri.file(filePath), content)
    }
}

export async function pathAccessible(testPath: string) {
    return fsp.access(testPath)
        .then(() => true)
        .catch(() => false)
}