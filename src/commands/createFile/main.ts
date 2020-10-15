import { Uri, window } from 'vscode';
import * as file from '../../utils/file';
import { getDatapackRoot, getFileTemplate, getFileType, getResourcePath, showInputBox } from '../../utils/common';
import path = require('path');
import { locale } from '../../locales';

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
    const fileExtension = fileType === 'function' ? '.mcfunction' : '.json';

    // ファイル名入力
    const fileName = await showInputBox(locale('create-file.function-name'), async v => {
        const invalidChar = v.match(/[^a-z0-9./_-]/g);
        if (invalidChar)
            return locale('error.unexpected-character', invalidChar.join(', '));
        if (await file.pathAccessible(path.join(uri.fsPath, v + fileExtension)))
            return locale('create-file.already-exists', v + fileExtension);
    });
    if (!fileName)
        return;

    // リソースパスの生成とファイルテンプレートの取得
    const filePath = path.join(uri.fsPath, fileName);
    const resourcePath = getResourcePath(filePath, datapackRoot);
    const fileTemplate = await getFileTemplate(fileType, resourcePath);

    // 生成
    file.createFile(filePath + fileExtension, fileTemplate);
}