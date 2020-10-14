import { workspace, window } from 'vscode';
import { getDatapackRoot, showInputBox } from '../../utils/common';
import path from 'path';
import * as file from '../../utils/file';
import { TextEncoder } from 'util';
import '../utils/methodExtensions';
import { codeConsole } from '../../extension';
import { getItems, getPackMcmeta } from './types/QuickPickFiles';

export async function createDatapack(): Promise<void> {
    // フォルダ選択
    const dir = await window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: workspace.workspaceFolders?.[0].uri,
        openLabel: 'Select',
        title: 'Select Datapack'
    }).then(v => v?.[0]);
    if (!dir)
        return;

    const datapackName = path.basename(dir.fsPath);

    // Datapack内部かチェック
    const datapackRoot = await getDatapackRoot(dir.fsPath);
    if (datapackRoot) {
        // 内部なら確認
        const warningMessage = `The selected directory is inside Datapack ${path.basename(datapackRoot)}. Would you like to create a Datapack here?`;
        const result = await window.showWarningMessage(warningMessage, 'Yes', 'Reselect', 'No');
        if (result === 'No')
            return;
        if (result === 'Reselect') {
            createDatapack();
            return;
        }
    }

    // 説明入力
    const datapackDiscription = await showInputBox('datapack Discription?');
    if (!datapackDiscription)
        return;

    // 名前空間入力
    const namespace = await showInputBox('namespace name?', v => !v.match(/^[a-z0-9./_-]*$/) ? 'Characters other than [a-z0-9./_-] exist.' : undefined);
    if (!namespace)
        return;

    // 生成するファイル/フォルダを選択
    const createItems = await window.showQuickPick(getItems(namespace, dir, datapackName), {
        canPickMany: true,
        ignoreFocusOut: true,
        matchOnDescription: false,
        matchOnDetail: false,
        placeHolder: 'Select files/folders to generate'
    });
    if (!createItems)
        return;

    createItems.push(getPackMcmeta(dir, datapackDiscription));
    const enconder = new TextEncoder();
    try {
        createItems.flat(v => v.changes).forEach(async v => {
            if (v.type === 'file')
                await file.create(v.fileUri, enconder.encode(v.content?.join('\r\n') ?? ''));
            if (v.type === 'folder')
                await file.createDir(v.fileUri);
        });
    } catch (error) {
        window.showErrorMessage('File already exists.');
        codeConsole.appendLine(error.stack ?? error.message ? `${error.name}: ${error.message}` : `${error.name}`);
    }
}