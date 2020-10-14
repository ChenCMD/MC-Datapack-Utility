import { workspace, window, Uri } from 'vscode';
import { getDatapackRoot, getResourcePath, isDatapackRoot, showInputBox } from '../../utils/common';
import path from 'path';
import { TextEncoder } from 'util';
import '../../utils/methodExtensions';
import { defaultItems, resolveVars, packMcMetaFileData, resolveNamespace } from './utils';
import * as file from '../../utils/file';

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
    if (!dir) // Escで終了
        return;

    // Datapack内部かチェック
    const datapackRoot = await getDatapackRoot(dir.fsPath);
    if (datapackRoot) {
        // 内部なら確認
        const warningMessage = `The selected directory is inside Datapack "${path.basename(datapackRoot)}". Would you like to create a Datapack here?`;
        const result = await window.showWarningMessage(warningMessage, 'Yes', 'Reselect', 'No');
        if (result === undefined || result === 'No')
            return;
        if (result === 'Reselect') {
            createDatapack();
            return;
        }
    }
    await create(dir);
    window.showInformationMessage('Datapack template generation is complete.');
}

async function create(dir: Uri) {
    // データパック名入力
    const datapackName = await showInputBox('Datapack name', v => v.match(/[\\/:*?"<>|]/) ? '[\\/:*?"<>|] Cannot be used in the name' : undefined);
    if (datapackName === undefined) // Escで終了
        return;
    if (datapackName === '') {
        window.showErrorMessage('The datapack name cannot be blank.');
        return;
    }
    const datapackRoot = path.join(dir.fsPath, datapackName);
    // データパック名の被りをチェック
    if (await isDatapackRoot(datapackRoot)) {
        // 内部なら確認
        const warningMessage = 'Duplicate datapack name. Would you like to create a Datapack here?';
        const result = await window.showWarningMessage(warningMessage, 'Yes', 'Rename', 'No');
        if (result === undefined || result === 'No')
            return;
        if (result === 'Rename') {
            await create(dir);
            return;
        }
    }

    // 説明入力
    const datapackDiscription = await showInputBox('Datapack discription');
    if (datapackDiscription === undefined) // Escで終了
        return;

    // 名前空間入力
    const namespace = await showInputBox('Namespace name', v => !v.match(/^[a-z0-9./_-]*$/) ? 'Characters other than [a-z0-9./_-] exist.' : undefined);
    if (namespace === undefined) // Escで終了
        return;
    if (namespace === '') {
        window.showErrorMessage('The namespace cannot be blank.');
        return;
    }

    // 生成するファイル/フォルダを選択
    const createItems = (await window.showQuickPick(defaultItems.map(v => {
        v.label = resolveNamespace(v.label, namespace);
        return v;
    }), {
        canPickMany: true,
        ignoreFocusOut: true,
        matchOnDescription: false,
        matchOnDetail: false,
        placeHolder: 'Select files/folders to generate'
    }))?.flat(v => v.changes);
    if (!createItems)
        return;

    createItems.push(packMcMetaFileData);
    const enconder = new TextEncoder();

    createItems.forEach(async v => {
        v.relativeFilePath = path.join(dir.fsPath, datapackName, resolveNamespace(v.relativeFilePath, namespace));
        if (v.type === 'file' && await file.pathAccessible(v.relativeFilePath))
            await file.createFile(v.relativeFilePath, enconder.encode(v.content?.map(v2 => resolveVars(v2, namespace, getResourcePath(v.relativeFilePath, datapackRoot))).join('\r\n') ?? ''));
        if (v.type === 'folder')
            await file.createDir(v.relativeFilePath);
    });
}