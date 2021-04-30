import { ExtensionContext, commands, window, workspace, ConfigurationChangeEvent, languages } from 'vscode';
import { copyResourcePath, createDatapack, createFile, generateMultiLine, scoreOperation } from './commands';
import { McfunctionFormatter } from './languages';
import { loadLocale } from './locales';
import { Config, constructConfig } from './types/Config';
import { createFeatureContext } from './types/FeatureContext';
import { VersionInformation } from './types/VersionInformation';
import { getLatestVersions } from './utils/vanillaData';

export const codeConsole = window.createOutputChannel('MC Commander Util');
let config = constructConfig(workspace.getConfiguration('mcdutil'));
export let versionInformation: VersionInformation | undefined;
const vscodeLanguage = getVSCodeLanguage();

const mcfunctionFormatter = new McfunctionFormatter(config);

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate({ extensionUri, subscriptions }: ExtensionContext): void {

    getLatestVersions().then(info => versionInformation = info);

    loadLocale(config.env.language, vscodeLanguage);

    const disposable = [];

    const ctx = createFeatureContext({ extensionUri, config });

    disposable.push(commands.registerCommand('mcdutil.commands.createDatapackTemplate', () => createDatapack(config)));
    disposable.push(commands.registerCommand('mcdutil.commands.createFile', uri => createFile(uri, config)));
    disposable.push(commands.registerCommand('mcdutil.commands.scoreOperation', () => scoreOperation(config)));
    disposable.push(commands.registerCommand('mcdutil.commands.copyResourcePath', copyResourcePath));
    disposable.push(commands.registerCommand('mcdutil.commands.generateMultiLine', () => generateMultiLine(ctx)));

    disposable.push(languages.registerDocumentFormattingEditProvider('mcfunction', mcfunctionFormatter));

    disposable.push(workspace.onDidChangeConfiguration(event => updateConfig(event, newConfig => {
        loadLocale(newConfig.env.language, vscodeLanguage);
        mcfunctionFormatter.config = newConfig;
    })));

    subscriptions.push(...disposable);

    // 拡張機能がアクティベートされた時にコンテキストメニューの項目を表示する
    commands.executeCommand('setContext', 'mcdutil.showContextMenu', true);
}

async function updateConfig(event: ConfigurationChangeEvent, cb: (config: Config) => void | Promise<void>): Promise<void> {
    if (event.affectsConfiguration('mcdutil')) {
        config = constructConfig(workspace.getConfiguration('mcdutil'));

        await cb(config);
    }
}

/**
 * @license
 * MIT License
 *
 * Copyright (c) 2019-2020 SPGoding
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
function getVSCodeLanguage(): string {
    if (process.env.VSCODE_NLS_CONFIG) {
        try {
            const codeConfig = JSON.parse(process.env.VSCODE_NLS_CONFIG);
            if (typeof codeConfig.locale === 'string') {
                const code: string = codeConfig.locale;
                return code === 'en-us' ? 'en' : code;
            } else {
                codeConsole.appendLine(`Have issues parsing VSCODE_NLS_CONFIG: “${process.env.VSCODE_NLS_CONFIG}”`);
            }
        } catch (ignored) {
            codeConsole.appendLine(`Have issues parsing VSCODE_NLS_CONFIG: “${process.env.VSCODE_NLS_CONFIG}”`);
        }
    } else {
        codeConsole.appendLine('No VSCODE_NLS_CONFIG found.');
    }
    return 'en';
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate(): void { }