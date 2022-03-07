import { EndOfLine, InputBoxOptions, ProgressLocation, QuickPickItem, TextEditor, Uri, ViewColumn, window, workspace, WorkspaceFolder } from 'vscode';
import { getRadixRegExp, parseRadixFloat } from '.';
import { locale } from '../locales';
import { NotOpenTextDocumentError, NotOpenWorkspaceError, UserCancelledError } from '../types/Error';
import { MessageItemHasId } from '../types/MessageItemHasId';

export function getEolString(eol: EndOfLine): '\n' | '\r\n' {
    switch (eol) {
        case EndOfLine.LF:
            return '\n';
        case EndOfLine.CRLF:
            return '\r\n';
    }
}

export function getTextEditor(allowUndefined?: false): TextEditor;
export function getTextEditor(allowUndefined: true): TextEditor | undefined;
export function getTextEditor(allowUndefined?: boolean): TextEditor | undefined {
    const { activeTextEditor } = window;
    if (!allowUndefined && !activeTextEditor) throw new NotOpenTextDocumentError();
    return activeTextEditor;
}

export function getWorkspaceFolders(allowUndefined?: false): readonly WorkspaceFolder[];
export function getWorkspaceFolders(allowUndefined: true): readonly WorkspaceFolder[] | undefined;
export function getWorkspaceFolders(allowUndefined?: boolean): readonly WorkspaceFolder[] | undefined {
    const { workspaceFolders } = workspace;
    if (!allowUndefined && !workspaceFolders) throw new NotOpenWorkspaceError();
    return workspaceFolders;
}

export function getIndent(path: string): number {
    const config = workspace.getConfiguration('editor.tabSize', Uri.file(path));
    return config.get<number>('tabSize', 4);
}

export async function listenInput<T extends { toString(): string }>(
    message: string,
    validateInput?: (value: string) => Thenable<string | undefined> | string | undefined,
    preFill?: T,
    otherOption?: InputBoxOptions
): Promise<string> {
    const mes = message ? locale('input-here', message) : '';
    const ans = await window.showInputBox({
        value: preFill?.toString(),
        placeHolder: mes,
        prompt: mes,
        ignoreFocusOut: true,
        validateInput,
        ...otherOption
    });
    if (ans === undefined) throw new UserCancelledError();
    return ans;
}

export function numberValidator(str: string, { radix = 10, allowFloat, min, max }: { radix?: number, allowFloat?: boolean, min?: number, max?: number } = {}): undefined | string {
    if (!getRadixRegExp(radix, allowFloat ?? true).test(str)) return locale('error.invalid-number');
    if (min && min > parseRadixFloat(str, radix)) return locale('error.number-too-small', min);
    if (max && max < parseRadixFloat(str, radix)) return locale('error.number-too-large', max);
    return undefined;
}

export function stringValidator(str: string, { invalidCharRegex, emptyMessage, maxLength, minLength }: { invalidCharRegex?: RegExp, emptyMessage?: string, minLength?: number, maxLength?: number } = {}): string | undefined {
    if (invalidCharRegex) {
        const invalidChar = str.match(invalidCharRegex);
        if (invalidChar) return locale('error.unexpected-character', invalidChar.join(', '));
    }
    if (minLength && str.length < minLength) return locale('error.string-too-short', minLength);
    if (maxLength && str.length > maxLength) return locale('error.string-too-long', maxLength);
    if (str === '') return emptyMessage;
    return undefined;
}

export interface ListenDirOption {
    canSelectFiles?: boolean
    canSelectFolders?: boolean
    canSelectMany?: boolean
    defaultUri?: Uri
    filters?: { [key: string]: string[] }
}

export async function listenDir(title: string, openLabel: string, otherOption?: ListenDirOption & { canSelectMany?: false }): Promise<Uri>;
export async function listenDir(title: string, openLabel: string, otherOption?: ListenDirOption & { canSelectMany: true }): Promise<Uri[]>;
export async function listenDir(title: string, openLabel: string, option: ListenDirOption = {}): Promise<Uri | Uri[]> {
    const ans = await window.showOpenDialog({
        canSelectFiles: option.canSelectFiles ?? false,
        canSelectFolders: option.canSelectFolders ?? true,
        canSelectMany: option.canSelectMany ?? false,
        defaultUri: option.defaultUri ?? workspace.workspaceFolders?.[0].uri,
        openLabel,
        title,
        filters: option.filters
    }).then(v => option.canSelectMany ? v : v?.[0]);
    if (!ans) throw new UserCancelledError();
    return ans;
}

export async function listenPickItem<T extends QuickPickItem>(placeHolder: string, items: T[], canPickMany: false): Promise<T>;
export async function listenPickItem<T extends QuickPickItem>(placeHolder: string, items: T[], canPickMany?: true): Promise<T[]>;
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

export async function showInfo(message: string, modal?: boolean): Promise<void>;
export async function showInfo(message: string, modal: boolean, items: MessageItemHasId[], cancelledString?: string[]): Promise<string>;
export async function showInfo(message: string, modal?: boolean, items?: MessageItemHasId[], cancelledString?: string[]): Promise<string | void> {
    if (items) {
        const ans = await window.showInformationMessage(message, { modal }, ...items);
        if (!ans || cancelledString?.includes(ans.id)) throw new UserCancelledError();
        return ans.id;
    }
    await window.showInformationMessage(message, { modal });
    return;
}

export async function showWarning(message: string, modal?: boolean): Promise<void>;
export async function showWarning(message: string, modal: boolean, items: MessageItemHasId[], cancelledString?: string[]): Promise<string>;
export async function showWarning(message: string, modal?: boolean, items?: MessageItemHasId[], cancelledString?: string[]): Promise<string | void> {
    if (items) {
        const ans = await window.showWarningMessage(message, { modal }, ...items);
        if (!ans || cancelledString?.includes(ans.id)) throw new UserCancelledError();
        return ans.id;
    }
    await window.showWarningMessage(message, { modal });
    return;
}

export async function showError(message: string, modal?: boolean): Promise<void>;
export async function showError(message: string, modal: boolean, items: MessageItemHasId[], cancelledString?: string[]): Promise<string>;
export async function showError(message: string, modal?: boolean, items?: MessageItemHasId[], cancelledString?: string[]): Promise<string | void> {
    if (items) {
        const ans = await window.showErrorMessage(message, { modal }, ...items);
        if (!ans || cancelledString?.includes(ans.id)) throw new UserCancelledError();
        return ans.id;
    }
    await window.showErrorMessage(message, { modal });
    return;
}

/*
 * Copyright (c) Microsoft Corporation
 *
 * All rights reserved.
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software
 * is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
 * OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export async function listenInputMultiLine(
    extensionUri: Uri,
    message: string
): Promise<string> {
    const getNonce = () => {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    };

    const mes = message ? locale('input-here', message) : '';
    const ans = await new Promise<string>((resolve, reject) => {
        const panel = window.createWebviewPanel('mcdutilStringInput', mes, ViewColumn.Beside, { enableScripts: true, localResourceRoots: [Uri.joinPath(extensionUri, 'resource')] });
        panel.title = mes;
        const { webview } = panel;

        const stylesResetUri = webview.asWebviewUri(Uri.joinPath(extensionUri, 'resource', 'reset.css'));
        const stylesMainUri = webview.asWebviewUri(Uri.joinPath(extensionUri, 'resource', 'vscode.css'));
        const scriptUri = webview.asWebviewUri(Uri.joinPath(extensionUri, 'resource', 'main.js'));
        const nonce = getNonce();

        webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';"">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${stylesResetUri}" rel="stylesheet">
                <link href="${stylesMainUri}" rel="stylesheet">
                <title>${mes}</title>
            </head>
            <body>
                <section class="container">
                    <form>
                        <fieldset>
                            <label for="messages">${mes}</label>
                            <textarea id="messages" rows="5" placeholder="${mes} ${locale('input-prompt-base-message')}"></textarea>
                            <button id="submit" class="button-primary">Submit</button>
                            <div class="float-right">
                                <button id="cancel" class="button button-outline">Cancel</button>
                            </div>
                        </fieldset>
                    </form>
                </section>
                <script nonce=${nonce} src="${scriptUri}"></script>
            </body>
            </html>`;

        webview.onDidReceiveMessage(res => {
            if (res.command === 'submit') resolve(res.message);
            if (res.command === 'cancel') reject(new UserCancelledError());
            panel.dispose();
            return;
        });
    });
    return ans;
}