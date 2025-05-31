import { ExtensionContext, commands, window, workspace, ConfigurationChangeEvent, languages, env } from 'vscode';
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

const mcfunctionFormatter = new McfunctionFormatter(config);

/**
 * @param {vscode.ExtensionContext} context
 */
export const activate = ({ extensionUri, subscriptions }: ExtensionContext): void => {
    const vscodeLanguage = env.language ?? 'en';

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

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const deactivate = (): void => { }
