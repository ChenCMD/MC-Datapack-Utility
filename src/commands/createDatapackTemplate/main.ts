import { workspace, window, Uri } from 'vscode';
import { getDatapackRoot, getResourcePath, isDatapackRoot, showInputBox } from '../../utils/common';
import path from 'path';
import { TextEncoder } from 'util';
import '../../utils/methodExtensions';
import { defaultItems, resolveVars, packMcMetaFileData, resolveNamespace } from './utils';
import * as file from '../../utils/file';
import { locale } from '../../locales';
import { createMessageItemsHasId, MessageItemHasId } from './types/MessageItems';

export async function createDatapack(): Promise<void> {
    // フォルダ選択
    const dir = await window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: workspace.workspaceFolders?.[0].uri,
        openLabel: locale('create-datapack-template.dialog-label'),
        title: locale('create-datapack-template.dialog-title')
    }).then(v => v?.[0]);
    if (!dir) // Escで終了
        return;

    // Datapack内部かチェック
    const datapackRoot = await getDatapackRoot(dir.fsPath);
    if (datapackRoot) {
        // 内部なら確認
        const warningMessage = locale('create-datapack-template.inside-datapack', path.basename(datapackRoot));
        const result = await window.showWarningMessage<MessageItemHasId>(warningMessage,
            createMessageItemsHasId('yes'),
            createMessageItemsHasId('reselect'),
            createMessageItemsHasId('no')
        );
        if (result === undefined || result.id === 'no')
            return;
        if (result.id === 'reselect') {
            createDatapack();
            return;
        }
    }
    await create(dir);
}

async function create(dir: Uri) {
    // データパック名入力
    const datapackName = await showInputBox(locale('create-datapack-template.datapack-name'), v => {
        const invalidChar = v.match(/[\\/:*?"<>|]/g);
        if (invalidChar)
            return locale('error.unexpected-character', invalidChar.join(', '));
    });
    if (datapackName === undefined) // Escで終了
        return;
    if (datapackName === '') {
        window.showErrorMessage(locale('create-datapack-template.name-blank'));
        return;
    }
    const datapackRoot = path.join(dir.fsPath, datapackName);
    // データパック名の被りをチェック
    if (await isDatapackRoot(datapackRoot)) {
        // 内部なら確認
        const warningMessage = locale('create-datapack-template.duplicate-datapack');
        const result = await window.showWarningMessage<MessageItemHasId>(warningMessage,
            createMessageItemsHasId('yes'),
            createMessageItemsHasId('rename'),
            createMessageItemsHasId('no')
        );
        if (result === undefined || result.id === 'no')
            return;
        if (result.id === 'rename') {
            await create(dir);
            return;
        }
    }

    // 説明入力
    const datapackDiscription = await showInputBox(locale('create-datapack-template.datapack-discription'));
    if (datapackDiscription === undefined) // Escで終了
        return;

    // 名前空間入力
    const namespace = await showInputBox('Namespace name', v => {
        const invalidChar = v.match(/[^a-z0-9./_-]/g);
        if (invalidChar)
            return locale('error.unexpected-character', invalidChar.join(', '));
    });
    if (namespace === undefined) // Escで終了
        return;
    if (namespace === '') {
        window.showErrorMessage(locale('create-datapack-template.namespace-blank'));
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
        placeHolder: locale('create-datapack-template.quickpick-placeholder')
    }))?.flat(v => v.changes);
    if (!createItems)
        return;

    createItems.push(packMcMetaFileData);
    const enconder = new TextEncoder();

    createItems.forEach(async v => {
        v.relativeFilePath = path.join(dir.fsPath, datapackName, resolveNamespace(v.relativeFilePath, namespace));
        if (v.type === 'file' && !await file.pathAccessible(v.relativeFilePath))
            await file.createFile(v.relativeFilePath, enconder.encode(v.content?.map(v2 => resolveVars(v2, namespace, getResourcePath(v.relativeFilePath, datapackRoot))).join('\r\n') ?? ''));
        if (v.type === 'folder')
            await file.createDir(v.relativeFilePath);
    });

    window.showInformationMessage(locale('create-datapack-template.complete'));
}