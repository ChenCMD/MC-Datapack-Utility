import { window } from 'vscode';
import '../../utils/methodExtensions';
import { codeConsole, config } from '../../extension';
import { showInputBox } from '../../utils/common';
import { rpnToScoreOperation } from './utils/converter';
import { formulaAnalyzer } from './utils/formula';
import { locale } from '../../locales';
import { opTable } from './types/OperateTable';

export async function scoreOperation(): Promise<void> {
    const prefix = config.scoreOperation.prefix;
    const objective = config.scoreOperation.objective;
    const temp = config.scoreOperation.temp;
    const inputType = config.scoreOperation.forceInputType;
    const editor = window.activeTextEditor;
    if (!editor)
        return;

    const customOperate = config.scoreOperation.customOperate;
    if (customOperate.length !== 0) {
        for (const e of customOperate) {
            opTable.table.push(e);
            opTable.identifiers.push(e.identifier);
        }
    }

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
        const formula = formulaAnalyzer(text.split(' = ').reverse().join(' = '), opTable);
        const result = await rpnToScoreOperation(formula, prefix, objective, temp);

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