import { appendElemFromKey, createDir, createFile, createProgressBar, getDate, getIndent, getResourcePath, getVanillaData, isStringArray, listenInput, listenPickItem, ObjectSet, pathAccessible, readFile, showError, showInfo, stringValidator, writeFile } from '../../utils';
import { Config, Variables, makeExtendQuickPickItem, GenerateError, resolveVars, CreateDatapackTemplateConfig, UserCancelledError, JsonObject } from '../../types';
import { locale } from '../../locales';
import { CustomQuestion, GenerateFileData, QuickPickFiles } from './types/QuickPickFiles';
import { dataFolder, packMcMetaData, pickItems } from './utils/data';
import { GenNodes, getGenTypeMap } from './nodes';
import { codeConsole, versionInformation } from '../../extension';
import { TextEncoder } from 'util';
import path from 'path';
import rfdc from 'rfdc';

export async function createDatapack({ env: { dataVersion, dateFormat }, createDatapackTemplate }: Config, generateType?: 'add' | 'create'): Promise<void> {
    try {
        // 生成する種類
        const generatorChildNode = new (
            generateType
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ? getGenTypeMap().get(`create-datapack-template.${generateType}`)!
                : await listenGenerateType()
        )();
        // ディレクトリ
        const dir = await generatorChildNode.listenGenerateDir();
        // データパック名とroot
        const { name, root } = await generatorChildNode.listenDatapackNameAndRoot(dir);
        // データパックのpack_format
        const packFormat = await generatorChildNode.listenPackFormat(root);
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
            packFormat: packFormat.toString(),
            datapackDescription,
            namespace
        };
        // テンプレートの選択
        const createItems = await listenGenerateTemplate(vars, createDatapackTemplate);
        // カスタムの質問
        const customVars = await listenCustomQuestion(new ObjectSet(createItems.flatMap(v => v.customQuestion ?? [])));
        // 生成用のデータに加工する
        const items = await toGenerateData(createItems, generatorChildNode.isGeneratePackMcMeta, dataVersion, packFormat);
        // 生成
        await generate(items, root, packFormat, { ...vars, ...customVars });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error instanceof UserCancelledError) return;
        if (error instanceof Error) showError(error.message);
        else showError(error.toString());
        codeConsole.appendLine(error.stack ?? error.toString());
    }
}

async function listenGenerateType(): Promise<GenNodes> {
    const res = await listenPickItem('', makeExtendQuickPickItem(getGenTypeMap()), false);
    return res.extend;
}

async function listenNamespace(): Promise<string> {
    return await listenInput(
        locale('create-datapack-template.namespace-name'),
        v => stringValidator(v, { invalidCharRegex: /[^a-z0-9./_-]/g, emptyMessage: locale('error.input-blank', locale('create-datapack-template.namespace-name')) })
    );
}

async function listenCustomQuestion(questions: ObjectSet<CustomQuestion>): Promise<Variables> {
    const ans: Variables = {};
    for (const question of questions) {
        let patternChecker: ((str: string) => string | undefined) | undefined = undefined;
        if (question.pattern) {
            patternChecker = (str: string) => new RegExp(`^${question.pattern}$`).test(str)
                ? undefined
                : question.patternErrorMessage ?? locale('create-datapack-template.pattern-error-default', `^${question.pattern}$`);
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

async function toGenerateData(createItems: QuickPickFiles[], isGeneratePackMcMeta: boolean, dataVersion: string, packFormat: number): Promise<GenerateFileData[]> {
    const ans = createItems.flatMap(v => v.generates);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const funcs = createItems.filter(v => v.func !== undefined).flatMap(v => v.func!);

    ans.push(rfdc()(dataFolder));
    if (isGeneratePackMcMeta) ans.push(packMcMetaData(packFormat));

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

async function generate(items: GenerateFileData[], root: string, packFormat: number, vars: Variables): Promise<void> {
    await createProgressBar(locale('create-datapack-template.progress.title'), async report => {
        const message = locale('create-datapack-template.progress.creating');
        report({ message });

        for (const item of items) {
            try {
                await singleGenerate(item, root, packFormat, vars);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
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

async function singleGenerate(item: GenerateFileData, root: string, packFormat: number, vars: Variables): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const filePath = path.join(root, resolveVars(item.rel, vars));

    if (item.type === 'folder') {
        await createDir(filePath);
        return;
    }
    if (item.type === 'file') {
        const indent = ' '.repeat(getIndent(filePath));

        if (!await pathAccessible(filePath)) {
            const singleVars = { fileResourcePath: getResourcePath(filePath, root, packFormat), ...vars };
            const contents = isStringArray(item.content)
                ? resolveVars(item.content, singleVars).join('\r\n')
                : JSON.stringify(resolveVars(item.content, singleVars), undefined, indent);

            await createFile(filePath, new TextEncoder().encode(contents ?? ''));
        } else if (item.append) {
            const { key, elem, addFirst } = item.append;
            const fileContent = await readFile(filePath);

            if (/\.json$/.test(filePath)) {
                const parsedJson = JSON.parse(fileContent) as JsonObject;

                const res = appendElemFromKey(parsedJson, key, resolveVars(elem, vars), addFirst ?? false);
                if (!res[0]) throw new GenerateError(locale(res[1], filePath, key));

                await writeFile(filePath, JSON.stringify(parsedJson, undefined, indent));
            } else {
                if (addFirst)
                    await writeFile(filePath, resolveVars(elem, vars) + fileContent);
                else
                    await writeFile(filePath, fileContent + resolveVars(elem, vars));
            }
        }
    }
}