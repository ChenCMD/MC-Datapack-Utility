import { ExtensionContext, commands, window, workspace } from 'vscode';
import { createDatapack, createFile, scoreOperation } from './commands';
import { loadLocale } from './locales';

export const codeConsole = window.createOutputChannel('MC Commander Util');
/**
 * @param {vscode.ExtensionContext} context
 */
exports.activate = function activate(context: ExtensionContext) {

    const config = workspace.getConfiguration('mccutil');

    loadLocale(config.language, 'en');

    const disposable = [];

    disposable.push(commands.registerCommand('mccutil.commands.createDatapackTemplate', createDatapack));
    disposable.push(commands.registerCommand('mccutil.commands.createFile', createFile));
    disposable.push(commands.registerCommand('mccutil.commands.scoreOperation', scoreOperation));

    context.subscriptions.push(...disposable);
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
exports.deactivete = function deactivate() { };