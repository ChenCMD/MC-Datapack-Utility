import { workspace, window, Uri } from 'vscode'
import * as common from '../utils/common'
import path from 'path'

export async function createDatapack(args: any[]) {

    // フォルダ選択
    const dir = await window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: workspace.workspaceFolders?.[0].uri,
        filters: undefined,
        openLabel: 'Select',
        title: 'Select Datapack'
    }).then(async value => value?.[0])

    if (!dir) return

    // Datapack内部かチェック
    const datapackRoot = await common.getDatapackRoot(dir.fsPath)

    if (datapackRoot) {
        // 内部なら確認
        const warningMessage = 'The selected directory is inside Datapack ' + path.basename(datapackRoot) + '. Would you like to create a Datapack here?'
        const result = await window.showWarningMessage(warningMessage, 'Yes', 'Reselect', 'No').then(value => value)
        if (result === 'No') return
        if (result === 'Reselect') {
            createDatapack(args)
            return
        }
    }


}