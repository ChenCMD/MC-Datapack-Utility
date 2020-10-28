import { window } from 'vscode';
import '../../utils/methodExtensions';
import { codeConsole, config } from '../../extension';
import { showInputBox } from '../../utils/common';
import { rpnToScoreOperation } from './utils/converter';
import { rpnParse } from './utils/parser';
import { locale } from '../../locales';

export async function scoreOperation(): Promise<void> {
    const prefix = config.get<string>('scoreOperation.prefix', '$MCDUtil_');
    const objective = config.get<string>('scoreOperation.objective', '_');
    const response = config.get<string>('scoreOperation.response', 'Return');
    const temp = config.get<string>('scoreOperation.temp', 'Temp_');
    const inputType = config.get<string>('scoreOperation.forceInputType', 'Default');
    const editor = window.activeTextEditor;
    if (!editor)
        return;

    let text = '';
    if (inputType !== 'Always InputBox')
        text = editor.document.getText(editor.selection);
    // セレクトされていないならInputBoxを表示
    if (text === '') {
        if (inputType === 'Always Selection') {
            window.showErrorMessage(locale('formula-to-score-operation.not-selection'));
            return;
        }
        const res = await showInputBox(locale('formula-to-score-operation.formula'));
        if (!res || res === '')
            return;
        text = res;
    }

    try {
        const formula = rpnParse(text.split('=').reverse().join('='));
        const result = rpnToScoreOperation(formula, prefix, objective, response, temp);
        if (!result)
            return;

        editor.edit(edit => {
            edit.replace(editor.selection, [
                `# ${text}`,
                `# ${locale('formula-to-score-operation.complate-text')}`,
                `scoreboard objectives add ${objective} dummy`,
                Array.from(result.resValues).join('\r\n'),
                '',
                result.resFormulas.join('\r\n')
            ].join('\r\n'));
        });
    } catch (error) {
        window.showErrorMessage(error.toString());
        codeConsole.appendLine(error.stack ?? error.toString());
    }
}