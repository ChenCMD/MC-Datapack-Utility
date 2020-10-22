import { Range, Uri, window } from 'vscode';
import { pathAccessible, createFile as create } from '../../utils/file';
import { getDatapackRoot, getNamespace, getResourcePath, showInputBox } from '../../utils/common';
import path = require('path');
import { locale } from '../../locales';
import { getFileTemplate } from './utils';
import { TextEncoder } from 'util';
import { getFileType } from '../../types/FileTypes';
import { resolveVars, VariableContainer } from '../../types/VariableContainer';

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
    const fileExtension = fileType === 'function' ? 'mcfunction' : 'json';

    // ファイル名入力
    const fileName = await showInputBox(locale('create-file.file-name', fileType), async v => {
        const invalidChar = v.match(/[^a-z0-9./_-]/g);
        if (invalidChar)
            return locale('error.unexpected-character', invalidChar.join(', '));
        if (await pathAccessible(path.join(uri.fsPath, `${v}.${fileExtension}`)))
            return locale('create-file.already-exists', `${v}.${fileExtension}`);
    });
    if (!fileName)
        return;

    // リソースパスの生成とファイルテンプレートの取得
    const filePath = path.join(uri.fsPath, `${fileName}.${fileExtension}`);

    const openFilePath = window.activeTextEditor?.document.uri.fsPath;
    let openFileResourcePath = '';
    let openFileName = '';
    let openFileType = '';
    let openFileExtname = '';
    if (openFilePath) {
        openFileType = getFileType(openFilePath, datapackRoot) ?? '';
        openFileResourcePath = openFileType ? getResourcePath(openFilePath, datapackRoot) : '';
        openFileName = path.parse(openFilePath).name;
        openFileExtname = path.extname(openFilePath).slice(1);
    }

    const variableContainer: VariableContainer = {
        datapackName: path.basename(datapackRoot),
        namespace: getNamespace(filePath, datapackRoot),

        fileResourcePath: getResourcePath(filePath, datapackRoot),
        fileName: fileName,
        fileType: fileType,
        fileExtname: fileExtension,

        nowOpenFileResourcePath: openFileResourcePath,
        nowOpenFileName: openFileName,
        nowOpenFileType: openFileType,
        nowOpenFileExtname: openFileExtname,

        cursor: ''
    };
    const fileTemplate = getFileTemplate(fileType);
    let cursor = undefined;
    fileTemplate.forEach((v, i) => {
        const res = v.search(/%cursor%/i);
        if (res !== -1) cursor = new Range(i, res, i, res);
    });

    // 生成
    await create(filePath, new TextEncoder().encode(resolveVars(fileTemplate.join('\r\n'), variableContainer)));
    // ファイルを開く
    await window.showTextDocument(Uri.file(filePath), { selection: cursor });
}