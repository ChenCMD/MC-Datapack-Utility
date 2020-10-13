import { Uri, window } from 'vscode';
import * as file from '../utils/file';
import { getDatapackRoot, getFileTemplate, getFileType, getResourcePath, showInputBox } from '../utils/common';
import path = require('path');

export async function createFile(uri: Uri): Promise<void> {
    // Datapack内か確認
    const datapackRoot = await getDatapackRoot(uri.fsPath);
    if (!datapackRoot) {
        window.showErrorMessage('Cannot create file because it is not a datapack.');
        return;
    }

    // ファイルの種類を取得
    const fileType = getFileType(uri.fsPath, datapackRoot);
    if (!fileType) {
        // 取得できない時の処理
        window.showErrorMessage('You can\'t create a file here.');
        return;
    }
    if (fileType === 'structure') {
        // ストラクチャはサポートしない
        window.showErrorMessage('Structure files are not supported.');
        return;
    }
    // 拡張子確定
    const fileExtension = fileType === 'function' ? '.mcfunction' : '.json';

    // ファイル名入力
    const fileName = await showInputBox('Function name?', async value => {
        if (!value.match(/^[a-z0-9./_-]*$/)) {
            return 'Characters other than [a-z0-9./_-] exist.';
        }
        if (await file.pathAccessible(path.join(uri.fsPath, value + fileExtension))) {
            return `This ${fileType} already exists.`;
        }
    });

    if (!fileName) {
        return;
    }

    // リソースパスの生成とファイルテンプレートの取得
    const filePath = path.join(uri.fsPath, fileName);
    const resourcePath = getResourcePath(filePath, datapackRoot);
    const fileTemplate = await getFileTemplate(fileType, resourcePath);

    // 生成
    file.create(filePath + fileExtension, fileTemplate);
}