import { Range, Uri, window } from 'vscode';
import { pathAccessible, createFile as create } from '../../utils/file';
import { getDatapackRoot, getDate, getNamespace, getResourcePath } from '../../utils/common';
import { listenInput } from '../../utils/vscodeWrapper';
import path = require('path');
import { locale } from '../../locales';
import { getFileTemplate } from './utils';
import { TextEncoder } from 'util';
import { FileType, getFileType } from '../../types/FileTypes';
import { resolveVars, VariableContainer } from '../../types/VariableContainer';
import { codeConsole, config } from '../../extension';
import { UserCancelledError } from '../../types/Error';

export async function createFile(uri: Uri): Promise<void> {
    // Datapack内か確認
    const datapackRoot = await getDatapackRoot(uri.fsPath);
    if (!datapackRoot) {
        window.showErrorMessage(locale('create-file.not-datapack'));
        return;
    }

    // ファイルの種類を取得
    const fileType = getFileType(uri.fsPath, datapackRoot);
    if (!fileType) {
        // 取得できない時の処理
        window.showErrorMessage(locale('create-file.unknown-filetype'));
        return;
    }
    if (fileType === 'structure') {
        // ストラクチャはサポートしない
        window.showErrorMessage(locale('create-file.structure'));
        return;
    }
    // 拡張子確定
    const fileExtname = fileType === 'function' ? 'mcfunction' : 'json';

    // ファイル名入力
    try {
        const fileName = await listenInput(locale('create-file.file-name', fileType), async v => {
            const invalidChar = v.match(/[^a-z0-9./_-]/g);
            if (invalidChar)
                return locale('error.unexpected-character', invalidChar.join(', '));
            if (await pathAccessible(path.join(uri.fsPath, `${v}.${fileExtname}`)))
                return locale('create-file.already-exists', `${v}.${fileExtname}`);
            return undefined;
        });

        // リソースパスの生成とファイルテンプレートの取得
        const filePath = path.join(uri.fsPath, `${fileName}.${fileExtname}`);

        const variableContainer: VariableContainer = {
            datapackName: path.basename(datapackRoot),
            namespace: getNamespace(filePath, datapackRoot),

            fileResourcePath: getResourcePath(filePath, datapackRoot, fileType),
            fileName,
            fileType,
            fileExtname,

            date: getDate(config.dateFormat),
            cursor: ''
        };


        const openFilePath = window.activeTextEditor?.document.uri.fsPath;
        if (openFilePath) {
            const nowOpenFileType = getFileType(path.dirname(openFilePath), datapackRoot) ?? '';
            variableContainer['nowOpenFileType'] = nowOpenFileType;
            variableContainer['nowOpenFileResourcePath'] = nowOpenFileType !== '' ? getResourcePath(openFilePath, datapackRoot, nowOpenFileType as FileType) : '';
            variableContainer['nowOpenFileName'] = openFilePath.match(/([^/\\]*(?=\.(?!.*\.))|(?<=^|(?:\/|\\))[^./\\]*$)/)?.shift() ?? '';
            variableContainer['nowOpenFileExtname'] = openFilePath.match(/(?<=\.)[^./\\]*?$/)?.shift() ?? '';
        }

        const fileTemplate = getFileTemplate(config.createFile.fileTemplate, fileType);
        let selection = undefined;
        fileTemplate.forEach((v, i) => {
            const res = v.search(/%cursor%/i);
            if (res !== -1) selection = new Range(i, res, i, res);
        });

        // 生成
        await create(filePath, new TextEncoder().encode(resolveVars(fileTemplate.join('\r\n'), variableContainer)));
        // ファイルを開く
        await window.showTextDocument(Uri.file(filePath), { selection });
    } catch (error) {
        if (error instanceof UserCancelledError) return;
        codeConsole.appendLine(error.toString());
    }
}