import { env, Uri, window } from 'vscode';
import { locale } from '../../locales';
import { getFileType } from '../../types/FileTypes';
import { getDatapackRoot, getResourcePath } from '../../utils/common';

export async function copyResourcePath(fileUri: Uri): Promise<void> {
    // Datapack内か確認
    const datapackRoot = await getDatapackRoot(fileUri.fsPath);
    if (!datapackRoot) {
        window.showErrorMessage(locale('copy-resource-path.not-datapack'));
        return;
    }

    // ファイルの種類を取得
    const fileType = getFileType(fileUri.fsPath, datapackRoot);
    if (!fileType) {
        // 取得できない時の処理
        window.showErrorMessage(locale('copy-resource-path.unknown-filetype'));
        return;
    }

    env.clipboard.writeText(getResourcePath(fileUri.fsPath, datapackRoot, fileType));
}