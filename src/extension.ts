import { ExtensionContext, commands, window, workspace } from 'vscode';
import { createDatapack, createFile, scoreOperation } from './commands';
import { loadLocale } from './locales';

export const codeConsole = window.createOutputChannel('MC Commander Util');
/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: ExtensionContext): void {

    const config = workspace.getConfiguration('mccutil');

    loadLocale(config.language, 'en');

    const disposable = [];

    disposable.push(commands.registerCommand('mccutil.commands.createDatapackTemplate', createDatapack));
    disposable.push(commands.registerCommand('mccutil.commands.createFile', createFile));
    disposable.push(commands.registerCommand('mccutil.commands.scoreOperation', scoreOperation));

    context.subscriptions.push(...disposable);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void { }