import { getDate, getResourcePath, appendElemFromKey } from '../../utils/common';
import { createProgressBar, getIndent, showError, showInfo } from '../../utils/vscodeWrapper';
import path from 'path';
import { TextEncoder } from 'util';
import '../../utils/methodExtensions';
import { packMcMetaData } from './utils/data';
import * as file from '../../utils/file';
import { locale } from '../../locales';
import { resolveVars, ContextContainer } from '../../types/ContextContainer';
import { codeConsole, config, versionInformation } from '../../extension';
import rfdc from 'rfdc';
import { GenerateFileData, GetGitHubDataFunc, QuickPickFiles } from './types/QuickPickFiles';
import { getVanillaData } from '../../utils/vanillaData';
import { listenDatapackName, listenDescription, listenNamespace, listenGenerateTemplate, listenGenerateDir, listenGenerateType } from './utils/userInputs';
import { GenerateError, UserCancelledError } from '../../types/Error';

export async function createDatapack(): Promise<void>;
export async function createDatapack(genType: string, dir: string): Promise<void>;
export async function createDatapack(genType?: string, dir?: string): Promise<void> {
    try {
        // 環境コンテナ作成
        const ctx: ContextContainer = { date: getDate(config.dateFormat), dir };
        // 生成タイプを聞く
        genType = genType ?? await listenGenerateType();
        // ディレクトリの選択
        if (!ctx.dir) await listenGenerateDir(ctx, genType);
        // データパック名入力
        await listenDatapackName(ctx, genType);
        // 説明入力
        await listenDescription(ctx, genType);
        // 名前空間入力
        await listenNamespace(ctx);
        // 生成するファイル/フォルダを選択
        const createItems = await listenGenerateTemplate(ctx);
        // 選択されたデータを生成用の形式に加工
        const generateData = await toGenerateData(createItems, genType);
        // 生成
        await generate(ctx, generateData);
    } catch (error) {
        if (error instanceof UserCancelledError) return;
        if (error instanceof Error) showError(error.message);
        else showError(error.toString());
        codeConsole.appendLine(error.stack ?? error.toString());
    }
}

export async function generate(ctxContainer: ContextContainer, generateData: GenerateFileData[]): Promise<void> {
    await createProgressBar(locale('create-datapack-template.progress.title'), async report => {
        const message = locale('create-datapack-template.progress.creating');
        report({ message });

        for (const item of generateData) {
            try {
                await singleGenerate(ctxContainer, item);
            } catch (error) {
                if (error instanceof Error) showError(error.message);
                else showError(error.toString());
                codeConsole.appendLine(error.stack ?? error.toString());
            } finally {
                report({ increment: 100 / generateData.length, message });
            }
        }
        showInfo(locale('create-datapack-template.complete'));
    });
}

export async function singleGenerate(ctxContainer: ContextContainer, item: GenerateFileData): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const datapackRoot = ctxContainer.datapackRoot!;
    const filePath = path.join(datapackRoot, resolveVars(item.rel, ctxContainer));

    if (item.type === 'folder') {
        await file.createDir(filePath);
        return;
    }
    if (item.type === 'file') {
        if (!await file.pathAccessible(filePath)) {
            const contents = item.content?.map(v => resolveVars(v, { fileResourcePath: getResourcePath(filePath, datapackRoot), ...ctxContainer }));
            await file.createFile(filePath, new TextEncoder().encode(contents?.join('\r\n') ?? ''));
        } else if (item.jsonAppend) {
            // eslint-disable-next-line prefer-const
            let { key, elem } = item.jsonAppend;
            const parsedJson = JSON.parse(await file.readFile(filePath));
            if (typeof elem === 'string') elem = resolveVars(elem, ctxContainer);
            if (!appendElemFromKey(parsedJson, key, elem)) throw new GenerateError(locale('could-not-access-key', filePath, key));
            file.writeFile(filePath, JSON.stringify(parsedJson, undefined, ' '.repeat(getIndent(filePath))));
        }
    }
}

export async function toGenerateData(createItems: QuickPickFiles[], genType: string): Promise<GenerateFileData[]> {
    const ans = createItems.flat(v => v.generates);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const funcs = createItems.filter(v => v.func !== undefined).flat(v => v.func!);

    if (genType === 'create-datapack-template.create') ans.push(rfdc()(packMcMetaData));

    for (const item of funcs.map((func, index) => ({ func, index }))) {
        await createProgressBar(
            locale('create-datapack-template.progress.title'),
            async report => ans.push(...await download(item.func, item.index, funcs.length, report))
        );
    }

    return ans;
}

export async function download(
    func: GetGitHubDataFunc, index: number, itemLength: number, report: (value: { increment?: number, message: string }) => void
): Promise<GenerateFileData[]> {
    const message = locale('create-datapack-template.progress.download', index + 1, itemLength);
    report({ message });

    const ans = await getVanillaData(
        config.createDatapackTemplate.dataVersion,
        versionInformation,
        func,
        func.rel,
        (_, m) => report({ increment: 100 / m, message })
    );

    return ans.map(fileData => ({ type: 'file', ...fileData }));
}