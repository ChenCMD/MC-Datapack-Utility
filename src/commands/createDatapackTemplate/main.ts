import { workspace, window, Uri } from 'vscode';
import { getDatapackRoot, getResourcePath, isDatapackRoot, showInputBox } from '../../utils/common';
import path from 'path';
import { TextEncoder } from 'util';
import '../../utils/methodExtensions';
import { defaultItems, packMcMetaFileData } from './types/Items';
import * as file from '../../utils/file';
import { locale } from '../../locales';
import { createMessageItemsHasId, MessageItemHasId } from './types/MessageItems';
import { config } from '../../extension';
import { resolveVars, VariableContainer } from '../../types/VariableContainer';

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
    create(dir);
}

async function create(dir: Uri): Promise<void> {
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
            create(dir);
            return;
        }
    }

    // 説明入力
    const datapackDescription = await showInputBox(locale('create-datapack-template.datapack-description'));
    if (datapackDescription === undefined) // Escで終了
        return;

    // 名前空間入力
    const namespace = await showInputBox(locale('create-datapack-template.namespace-name'), v => {
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

    const variableContainer: VariableContainer = {
        datapackName: datapackName,
        datapackDescription: datapackDescription,
        namespace: namespace
    };

    // 生成するファイル/フォルダを選択
    const quickPickItems = defaultItems;
    quickPickItems.push(...config.createDatapackTemplate.customTemplate);
    quickPickItems.forEach(v => v.label = resolveVars(v.label, variableContainer));
    const createItems = await window.showQuickPick(quickPickItems, {
        canPickMany: true,
        ignoreFocusOut: true,
        matchOnDescription: false,
        matchOnDetail: false,
        placeHolder: locale('create-datapack-template.quickpick-placeholder')
    }).then(v => v?.flat(v2 => v2.generates));
    if (!createItems)
        return;

    createItems.push(packMcMetaFileData);
    const enconder = new TextEncoder();

    for (const item of createItems.filter(v => v.type === 'file')) {
        item.relativeFilePath = path.join(dir.fsPath, datapackName, resolveVars(item.relativeFilePath, variableContainer));
        if (await file.pathAccessible(item.relativeFilePath)) continue;

        const containerHasResourcePath = Object.assign({ resourcePath: getResourcePath(item.relativeFilePath, datapackRoot) }, variableContainer);

        const str = item.content?.map(v => resolveVars(v, containerHasResourcePath)).join('\r\n');
        await file.createFile(item.relativeFilePath, enconder.encode(str ?? ''));
    }
    for (const item of createItems.filter(v => v.type === 'folder')) {
        item.relativeFilePath = path.join(dir.fsPath, datapackName, resolveVars(item.relativeFilePath, variableContainer));
        await file.createDir(item.relativeFilePath);
    }

    window.showInformationMessage(locale('create-datapack-template.complete'));
}