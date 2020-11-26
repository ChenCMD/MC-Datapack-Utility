import path from 'path';
import rfdc from 'rfdc';
import { config } from '../../../extension';
import { locale } from '../../../locales';
import { GenerateError } from '../../../types/Error';
import { ContextContainer, resolveVars } from '../../../types/ContextContainer';
import { getDatapackRoot, isDatapackRoot } from '../../../utils/common';
import { listenInput, validater, listenPickItem, listenOpenDir, showWarning } from '../../../utils/vscodeWrapper';
import { createMessageItemHasIds } from '../../../types/MessageItemHasId';
import { QuickPickFiles } from '../types/QuickPickFiles';
import { createQuickPickItemHasIds } from '../../../types/QuickPickItemHasId';
import { pickItems } from './data';
import { readFile } from '../../../utils/file';

export async function listenGenerateType(): Promise<string> {
    const items = createQuickPickItemHasIds('create-datapack-template.add', 'create-datapack-template.create');
    return (await listenPickItem('', items, false)).id;
}

export async function listenGenerateDir(ctxContainer: ContextContainer, genType: string): Promise<void> {
    let title: string;
    if (genType === 'create-datapack-template.create') title = locale('create-datapack-template.dialog-title-directory');
    else title = locale('create-datapack-template.dialog-title-datapack');
    const dir = await listenOpenDir(title, locale('create-datapack-template.dialog-label')).then(v => v.fsPath);

    if (genType === 'create-datapack-template.create') {
        const datapackRoot = await getDatapackRoot(dir);
        if (datapackRoot) {
            const warningMessage = locale('create-datapack-template.inside-datapack', path.basename(datapackRoot));
            const result = await showWarning(warningMessage, false, createMessageItemHasIds('yes', 'reselect', 'no'), ['no']);
            if (result === 'reselect') return await listenGenerateDir(ctxContainer, genType);
        }
    } else if (!await isDatapackRoot(dir)) {
        throw new GenerateError(locale('create-datapack-template.not-datapack'));
    }
    ctxContainer.dir = dir;
}

export async function listenDatapackName(ctxContainer: ContextContainer, genType: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dir = ctxContainer.dir!;

    if (genType === 'create-datapack-template.add') {
        ctxContainer.datapackName = path.basename(dir);
        ctxContainer.datapackRoot = dir;
        return;
    }

    // input表示
    const datapackName = await listenInput(
        locale('create-datapack-template.datapack-name'),
        v => validater(v, /[\\/:*?"<>|]/g, locale('create-datapack-template.name-blank'))
    );
    const datapackRoot = path.join(dir, datapackName);
    // データパックの重複をチェック
    if (await isDatapackRoot(datapackRoot)) {
        const warningMessage = locale('create-datapack-template.duplicate-datapack', path.basename(datapackRoot));
        const result = await showWarning(warningMessage, false, createMessageItemHasIds('yes', 'rename', 'no'), ['no']);
        if (result === 'rename') return await listenDatapackName(ctxContainer, genType = 'create-datapack-template.add');
    }
    // 環境コンテナに適用
    ctxContainer.datapackName = datapackName;
    ctxContainer.datapackRoot = datapackRoot;
}

export async function listenDescription(ctxContainer: ContextContainer, genType: string): Promise<void> {
    if (genType === 'create-datapack-template.create') {
        ctxContainer.datapackDescription = await listenInput(locale('create-datapack-template.datapack-description'));
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ctxContainer.datapackDescription = JSON.parse(await readFile(path.join(ctxContainer.dir!, 'pack.mcmeta'))).pack.description;
}

export async function listenNamespace(ctxContainer: ContextContainer): Promise<void> {
    ctxContainer.namespace = await listenInput(
        locale('create-datapack-template.namespace-name'),
        v => validater(v, /[^a-z0-9./_-]/g, locale('create-datapack-template.namespace-blank'))
    );
}

export async function listenGenerateTemplate(variableContainer: ContextContainer): Promise<QuickPickFiles[]> {
    const items = [...rfdc()(pickItems), ...config.createDatapackTemplate.customTemplate];
    items.forEach(v => v.label = resolveVars(v.label, variableContainer));
    return await listenPickItem(locale('create-datapack-template.quickpick-placeholder'), items, true);
}