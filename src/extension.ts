import { ExtensionContext, commands, window } from 'vscode';
import { createDatapack, createFile, scoreOperation } from './commands';

export const codeConsole = window.createOutputChannel('MC Commander Util');
/**
 * @param {vscode.ExtensionContext} context
 */
exports.activate = function activate(context: ExtensionContext) {


    const disposable = [];

    disposable.push(commands.registerCommand('mccutil.commands.createDatapackTemplate', createDatapack));
    disposable.push(commands.registerCommand('mccutil.commands.createFile', createFile));
    disposable.push(commands.registerCommand('mccutil.commands.scoreOperation', scoreOperation));

    context.subscriptions.push(...disposable);
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
exports.deactivete = function deactivate() { };