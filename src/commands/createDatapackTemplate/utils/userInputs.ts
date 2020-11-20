import path from 'path';
import rfdc from 'rfdc';
import { Uri, window } from 'vscode';
import { config } from '../../../extension';
import { locale } from '../../../locales';
import { UserCancelledError } from '../../../types/Error';
import { VariableContainer, resolveVars } from '../../../types/VariableContainer';
import { getDatapackRoot, isDatapackRoot } from '../../../utils/common';
import { listenInput, validater, listenPickItem, listenOpenDir } from '../../../utils/vscodeWrapper';
import { createMessageItemHasIds } from '../types/MessageItemHasId';
import { QuickPickFiles } from '../types/QuickPickFiles';
import { pickItems } from './data';

export async function listenGenerateDir(): Promise<Uri> {
    const dir = await listenOpenDir(locale('create-datapack-template.dialog-title'), locale('create-datapack-template.dialog-label'));
    const checkDatapackRoot = await getDatapackRoot(dir.fsPath);

    if (checkDatapackRoot) {
        const warningMessage = locale('create-datapack-template.inside-datapack', path.basename(checkDatapackRoot));
        const result = await window.showWarningMessage(warningMessage, ...createMessageItemHasIds('yes', 'reselect', 'no'));
        if (result === undefined || result.id === 'no') throw new UserCancelledError();
        if (result.id === 'reselect') return await listenGenerateDir();
    }
    return dir;
}

export async function listenDatapackName(dir: Uri): Promise<{datapackName: string, datapackRoot: string}> {
    const datapackName = await listenInput(
        locale('create-datapack-template.datapack-name'),
        v => validater(v, /[\\/:*?"<>|]/g, locale('create-datapack-template.name-blank'))
    );
    const datapackRoot = path.join(dir.fsPath, datapackName);

    if (await isDatapackRoot(datapackRoot)) {
        const warningMessage = locale('create-datapack-template.duplicate-datapack', path.basename(datapackRoot));
        const result = await window.showWarningMessage(warningMessage, ...createMessageItemHasIds('yes', 'rename', 'no'));
        if (result === undefined || result.id === 'no') throw new UserCancelledError();
        if (result.id === 'rename') return await listenDatapackName(dir);
    }
    return {datapackName, datapackRoot};
}

export async function listenDescription(): Promise<string> {
    return await listenInput(locale('create-datapack-template.datapack-description'));
}

export async function listenNamespace(): Promise<string> {
    return await listenInput(
        locale('create-datapack-template.namespace-name'),
        v => validater(v, /[^a-z0-9./_-]/g, locale('create-datapack-template.namespace-blank'))
    );
}

export async function listenGenerateTemplate(variableContainer: VariableContainer): Promise<QuickPickFiles[]> {
    const items = [...rfdc()(pickItems), ...config.createDatapackTemplate.customTemplate];
    items.forEach(v => v.label = resolveVars(v.label, variableContainer));
    return await listenPickItem(locale('create-datapack-template.quickpick-placeholder'), items, true);
}