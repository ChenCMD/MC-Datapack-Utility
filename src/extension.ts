import vscode = require('vscode')
import * as commands from './service/index'

/**
 * @param {vscode.ExtensionContext} context
 */
exports.activate = function activate(context: vscode.ExtensionContext) {

    const disposable = []

    disposable.push(vscode.commands.registerCommand('mccutil.commands.createDatapackTemplate', commands.createDatapack))
    disposable.push(vscode.commands.registerCommand('mccutil.commands.createFile', commands.createFile))
    disposable.push(vscode.commands.registerCommand('mccutil.scoreOperation', commands.scoreOperation))

    context.subscriptions.push(...disposable)
}

exports.deactivete = function deactivate() { }