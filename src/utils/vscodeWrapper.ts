import { ProgressLocation, QuickPickItem, Uri, window, workspace } from 'vscode';
import { locale } from '../locales';
import { UserCancelledError } from '../types/Error';

export async function listenInput(
    message?: string, validateInput?: (value: string) => Thenable<string | undefined> | string | undefined
): Promise<string> {
    const mes = message ? locale('input-here', message) : '';
    const ans = await window.showInputBox({
        value: mes,
        placeHolder: '',
        prompt: mes,
        ignoreFocusOut: true,
        validateInput
    });
    if (ans === undefined) throw new UserCancelledError();
    return ans;
}

export function validater(v: string, validatePattern: RegExp, message: string): string | undefined {
    const invalidChar = v.match(validatePattern);
    if (invalidChar) return locale('error.unexpected-character', invalidChar.join(', '));
    if (v === '') return message;
    return undefined;
}

export async function listenOpenDir(title: string, openLabel: string): Promise<Uri> {
    // フォルダ選択
    const ans = await window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: workspace.workspaceFolders?.[0].uri,
        openLabel,
        title
    }).then(v => v?.[0]);
    if (!ans) throw new UserCancelledError();
    return ans;
}

export async function listenPickItem<T extends QuickPickItem>(placeHolder: string, items: T[], canPickMany: false): Promise<T>;
export async function listenPickItem<T extends QuickPickItem>(placeHolder: string, items: T[], canPickMany: true): Promise<T[]>;
export async function listenPickItem<T extends QuickPickItem>(placeHolder: string, items: T[], canPickMany = true): Promise<T | T[]> {
    const ans = await window.showQuickPick(items, {
        canPickMany,
        ignoreFocusOut: true,
        matchOnDescription: false,
        matchOnDetail: false,
        placeHolder
    });
    if (!ans) throw new UserCancelledError();
    return ans;
}

export async function createProgressBar<T>(
    title: string,
    task: (report: (value: { increment?: number, message?: string }) => void) => Promise<T> | T
): Promise<T> {
    return await window.withProgress<T>({
        location: ProgressLocation.Notification,
        cancellable: false,
        title
    }, async progress => await task((value: { increment?: number, message?: string }) => progress.report(value)));
}