import { env, Uri } from 'vscode'
import { locale } from '../../locales'
import * as path from 'path'
import { getFileType } from '../../types/FileTypes'
import { getDatapackRoot, getPackFormat, getResourcePath } from '../../utils/common'
import { showError } from '../../utils/vscodeWrapper'

export const copyResourcePath = async (fileUri: Uri): Promise<void> => {
    // Datapack内か確認
    const datapackRoot = await getDatapackRoot(fileUri.fsPath)
    if (!datapackRoot) {
        showError(locale('copy-resource-path.not-datapack'))
        return
    }
    // pack_format の取得
    const packFormat = await getPackFormat(datapackRoot)

    // ファイルの種類を取得
    const fileType = getFileType(path.dirname(fileUri.fsPath), datapackRoot, packFormat)
    if (!fileType) {
        // 取得できない時の処理
        showError(locale('copy-resource-path.unknown-filetype'))
        return
    }

    env.clipboard.writeText(getResourcePath(fileUri.fsPath, datapackRoot, packFormat, fileType))
}
