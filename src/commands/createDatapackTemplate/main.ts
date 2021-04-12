import { appendElemFromKey, createDir, createFile, createProgressBar, getDate, getIndent, getResourcePath, getVanillaData, isStringArray, listenInput, listenPickItem, pathAccessible, readFile, showError, showInfo, validater, writeFile } from '../../utils';
import { Config, Variables, createQuickPickItemHasIds, GenerateError, resolveVars, CreateDatapackTemplateConfig, UserCancelledError } from '../../types';
import { locale } from '../../locales';
import { GenerateFileData, QuickPickFiles } from './types/QuickPickFiles';
import { getGenTypeMap } from './types/GenerateType';
import { dataFolder, packMcMetaData, pickItems } from './utils/data';
import { GenNodes } from './nodes';
import { codeConsole, versionInformation } from '../../extension';
import { TextEncoder } from 'util';
import path from 'path';
import rfdc from 'rfdc';
import { CustomQuestion } from './types/CustomQuestion';

export async function createDatapack({ createDatapackTemplate, dateFormat }: Config, generateType?: 'add' | 'create'): Promise<void> {
    try {
        // 生成する種類
        const generatorChildNode = new (
            generateType
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ? getGenTypeMap().get(locale(`create-datapack-template.${generateType}`))!
                : await listenGenerateType()
        )();
        // ディレクトリ
        const dir = await generatorChildNode.listenGenerateDir();
        // データパック名とroot
        const { name, root } = await generatorChildNode.listenDatapackNameAndRoot(dir);
        // データパックのdescription
        const datapackDescription = await generatorChildNode.listenDatapackDescription(dir);
        // 名前空間
        const namespace = await listenNamespace();
        // 変数の作成
        const vars: Variables = {
            date: getDate(dateFormat),
            dir,
            datapackName: name,
            datapackRoot: root,
            datapackDescription,
            namespace,
            // カスタムの質問
            ...await listenCustomQuestion(createDatapackTemplate.customQuestion)
        };
        // テンプレートの選択
        const createItems = await listenGenerateTemplate(vars, createDatapackTemplate);
        // 生成用のデータに加工する
        const items = await toGenerateData(createItems, generatorChildNode.isGeneratePackMcMeta, createDatapackTemplate.dataVersion);
        // 生成
        await generate(items, root, vars);
    } catch (error) {
        if (error instanceof UserCancelledError) return;
        if (error instanceof Error) showError(error.message);
        else showError(error.toString());
        codeConsole.appendLine(error.stack ?? error.toString());
    }
}

async function listenGenerateType(): Promise<GenNodes> {
    const res = await listenPickItem('', createQuickPickItemHasIds(getGenTypeMap()), false);
    return res.extend;
}

async function listenNamespace(): Promise<string> {
    return await listenInput(
        locale('create-datapack-template.namespace-name'),
        v => validater(v, /[^a-z0-9./_-]/g, locale('create-datapack-template.namespace-blank'))
    );
}

async function listenCustomQuestion(questions: CustomQuestion[]): Promise<Variables> {
    const ans: Variables = {};
    for (const question of questions) {
        let patternChecker: ((str: string) => string | undefined) | undefined = undefined;
        if (question.pattern) {
            patternChecker = (str: string) => new RegExp(`^${question.pattern}$`).test(str)
                ? undefined
                : question.patternErrorMessage ?? locale('create-datapack-template.defaultPatternErrorMessage', `^${question.pattern}$`);
        }

        ans[question.name] = await listenInput(question.question, patternChecker);
    }
    return ans;
}

async function listenGenerateTemplate(vars: Variables, config: CreateDatapackTemplateConfig): Promise<QuickPickFiles[]> {
    const items: QuickPickFiles[] = [];
    if (config.defaultLoadAndTick) items.push(...rfdc()(pickItems['#load & #tick']));
    if (config.defaultVanillaData) items.push(...rfdc()(pickItems['Vanilla data']));
    if (config.defaultFolder) items.push(...rfdc()(pickItems['Folders']));
    items.push(...config.customTemplate);
    items.forEach(v => v.label = resolveVars(v.label, vars));
    return await listenPickItem(locale('create-datapack-template.quickpick-placeholder'), items, true);
}

async function toGenerateData(createItems: QuickPickFiles[], isGeneratePackMcMeta: boolean, dataVersion: string): Promise<GenerateFileData[]> {
    const ans = createItems.flat(v => v.generates);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const funcs = createItems.filter(v => v.func !== undefined).flat(v => v.func!);

    ans.push(rfdc()(dataFolder));
    if (isGeneratePackMcMeta) ans.push(rfdc()(packMcMetaData));

    for (const [i, func] of funcs.entries()) {
        await createProgressBar(
            locale('create-datapack-template.progress.title'),
            async report => {
                const message = locale('create-datapack-template.progress.download', i + 1, funcs.length);
                report({ message });

                const res = await getVanillaData(
                    dataVersion,
                    versionInformation,
                    func,
                    func.rel,
                    (_, m) => report({ increment: 100 / m, message })
                );

                ans.push(...res.map<GenerateFileData>(fileData => ({ type: 'file', ...fileData })));
            }
        );
    }

    return ans;
}

async function generate(items: GenerateFileData[], root: string, vars: Variables): Promise<void> {
    await createProgressBar(locale('create-datapack-template.progress.title'), async report => {
        const message = locale('create-datapack-template.progress.creating');
        report({ message });

        for (const item of items) {
            try {
                await singleGenerate(item, root, vars);
            } catch (error) {
                if (error instanceof Error) showError(error.message);
                else showError(error.toString());
                codeConsole.appendLine(error.stack ?? error.toString());
            } finally {
                report({ increment: 100 / items.length, message });
            }
        }
        showInfo(locale('create-datapack-template.complete'));
    });
}

async function singleGenerate(item: GenerateFileData, root: string, vars: Variables): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const filePath = path.join(root, resolveVars(item.rel, vars));

    if (item.type === 'folder') {
        await createDir(filePath);
        return;
    }
    if (item.type === 'file') {
        const indent = ' '.repeat(getIndent(filePath));

        if (!await pathAccessible(filePath)) {
            const singleVars = { fileResourcePath: getResourcePath(filePath, root), ...vars };
            const contents = isStringArray(item.content)
                ? resolveVars(item.content, singleVars).join('\r\n')
                : JSON.stringify(resolveVars(item.content, singleVars), undefined, indent);

            await createFile(filePath, new TextEncoder().encode(contents ?? ''));
        } else if (item.append) {
            const { key, elem } = item.append;
            const parsedJson = JSON.parse(await readFile(filePath));

            const res = appendElemFromKey(parsedJson, key, resolveVars(elem, vars));
            if (!res[0]) throw new GenerateError(locale(res[1], filePath, key));

            writeFile(filePath, JSON.stringify(parsedJson, undefined, indent));
        }
    }
}