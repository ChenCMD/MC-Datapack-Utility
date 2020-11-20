import { window } from 'vscode';
import { getDate, getResourcePath } from '../../utils/common';
import { createProgressBar } from '../../utils/vscodeWrapper';
import path from 'path';
import { TextEncoder } from 'util';
import '../../utils/methodExtensions';
import { packMcMetaData } from './utils/data';
import * as file from '../../utils/file';
import { locale } from '../../locales';
import { resolveVars, VariableContainer } from '../../types/VariableContainer';
import { getFileType } from '../../types/FileTypes';
import { codeConsole, config, versionInformation } from '../../extension';
import rfdc from 'rfdc';
import { GenerateFileData, GetGitHubDataFunc, QuickPickFiles } from './types/QuickPickFiles';
import { getVanillaData } from '../../utils/vanillaData';
import { listenDatapackName, listenDescription, listenNamespace, listenGenerateTemplate, listenGenerateDir } from './utils/userInputs';
import { UserCancelledError } from '../../types/Error';

export async function createDatapack(): Promise<void> {
    try {
        // ディレクトリの選択
        const dir = await listenGenerateDir();
        // データパック名入力
        const { datapackName, datapackRoot } = await listenDatapackName(dir);
        // 説明入力
        const datapackDescription = await listenDescription();
        // 名前空間入力
        const namespace = await listenNamespace();
        // 変数コンテナ作成
        const variableContainer: VariableContainer = { datapackName, datapackDescription, namespace, date: getDate(config.dateFormat) };
        // 生成するファイル/フォルダを選択
        const createItems = await listenGenerateTemplate(variableContainer);
        // 選択されたデータを生成用の形式に加工
        const generateData = await toGenerateData(createItems);
        // 生成
        await generate(generateData, datapackRoot, variableContainer);
    } catch (error) {
        if (error instanceof UserCancelledError) return;
        window.showErrorMessage(error.toString());
        codeConsole.appendLine(error);
    }
}

export async function generate(generateData: GenerateFileData[], datapackRoot: string, variableContainer: VariableContainer): Promise<void> {
    await createProgressBar(locale('create-datapack-template.progress.title'), async report => {
        const message = locale('create-datapack-template.progress.creating');
        report({ increment: 0, message });

        for (const item of generateData) {
            const filePath = path.join(datapackRoot, resolveVars(item.rel, variableContainer));

            if (item.type === 'folder') {
                await file.createDir(filePath);
            } else if (!await file.pathAccessible(filePath)) {
                const fileResourcePath = getResourcePath(filePath, datapackRoot, getFileType(filePath, datapackRoot));
                const str = item.content?.map(v => resolveVars(v, { fileResourcePath, ...variableContainer })).join('\r\n');
                await file.createFile(filePath, new TextEncoder().encode(str ?? ''));
            }
            report({ increment: 100 / generateData.length, message });
        }
        window.showInformationMessage(locale('create-datapack-template.complete'));
    });
}

export async function toGenerateData(createItems: QuickPickFiles[]): Promise<GenerateFileData[]> {
    const generateData = createItems.flat(v => v.generates);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const funcs = createItems.filter(v => v.func !== undefined).flat(v => v.func!);

    generateData.push(rfdc()(packMcMetaData));
    for (const item of funcs.map((func, index) => ({ func, index }))) {
        await createProgressBar(
            locale('create-datapack-template.progress.title'),
            async report => generateData.push(...await download(item.func, item.index, funcs.length, report))
        );
    }

    return generateData;
}

export async function download(
    func: GetGitHubDataFunc, index: number, itemLength: number, report: (value: { increment: number, message: string }) => void
): Promise<GenerateFileData[]> {
    const message = locale('create-datapack-template.progress.download', index, itemLength);
    report({ increment: 0, message });

    const fileDatas = await getVanillaData(
        config.createDatapackTemplate.dataVersion,
        versionInformation,
        func,
        func.rel,
        (_, m) => report({ increment: 100 / m, message })
    );

    return fileDatas.map(fileData => ({ type: 'file', ...fileData }));
}