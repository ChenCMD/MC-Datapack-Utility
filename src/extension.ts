import { ExtensionContext, commands, window } from 'vscode';
import * as services from './service/index';

export const codeConsole = window.createOutputChannel('MC Commander Util');
/**
 * @param {vscode.ExtensionContext} context
 */
exports.activate = function activate(context: ExtensionContext) {


    const disposable = [];

    disposable.push(commands.registerCommand('mccutil.commands.createDatapackTemplate', services.createDatapack));
    disposable.push(commands.registerCommand('mccutil.commands.createFile', services.createFile));
    disposable.push(commands.registerCommand('mccutil.commands.scoreOperation', services.scoreOperation));

    context.subscriptions.push(...disposable);
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
exports.deactivete = function deactivate() { };