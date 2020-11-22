import { env, Uri } from 'vscode';
import { locale } from '../../locales';
import { getFileType } from '../../types/FileTypes';
import { getDatapackRoot, getResourcePath } from '../../utils/common';
import { showError } from '../../utils/vscodeWrapper';

export async function copyResourcePath(fileUri: Uri): Promise<void> {
    // Datapack内か確認
    const datapackRoot = await getDatapackRoot(fileUri.fsPath);
    if (!datapackRoot) {
        showError(locale('copy-resource-path.not-datapack'));
        return;
    }

    // ファイルの種類を取得
    const fileType = getFileType(fileUri.fsPath, datapackRoot);
    if (!fileType) {
        // 取得できない時の処理
        showError(locale('copy-resource-path.unknown-filetype'));
        return;
    }

    env.clipboard.writeText(getResourcePath(fileUri.fsPath, datapackRoot, fileType));
}