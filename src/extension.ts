import vscode = require('vscode')
import * as commands from './service/index'

/**
 * @param {vscode.ExtensionContext} context
 */
exports.activate = function activate(context: vscode.ExtensionContext) {

    const disposable = []

    disposable.push(vscode.commands.registerCommand('mccutil.createDatapackTemplate', commands.createDatapack))
    disposable.push(vscode.commands.registerCommand('mccutil.createFile', commands.createFile))

    context.subscriptions.push(...disposable)
}

exports.deactivete = function deactivate() { }