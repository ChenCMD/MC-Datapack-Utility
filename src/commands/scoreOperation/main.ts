import { window } from 'vscode';
import '../../utils/methodExtensions';
import { codeConsole, config } from '../../extension';
import { listenInput } from '../../utils/vscodeWrapper';
import { rpnToScoreOperation } from './utils/converter';
import { formulaAnalyzer } from './utils/formula';
import { locale } from '../../locales';
import { opTable } from './types/OperateTable';

export async function scoreOperation(): Promise<void> {
    const { prefix, objective, temp, forceInputType, isAlwaysSpecifyObject } = config.scoreOperation;
    const editor = window.activeTextEditor;
    if (!editor) return;

    const customOperate = config.scoreOperation.customOperate;
    if (customOperate.length !== 0) {
        for (const e of customOperate) {
            opTable.table.push(e);
            opTable.identifiers.push(e.identifier);
        }
    }

    let text = '';
    if (forceInputType !== 'Always InputBox') text = editor.document.getText(editor.selection);
    // セレクトされていないならInputBoxを表示
    if (text === '') {
        if (forceInputType === 'Always Selection') {
            window.showErrorMessage(locale('formula-to-score-operation.not-selection'));
            return;
        }
        const res = await listenInput(locale('formula-to-score-operation.formula'));
        if (!res) return;
        text = res;
    }

    try {
        const formula = formulaAnalyzer(text.split(' = ').reverse().join(' = '), opTable);
        const result = await rpnToScoreOperation(formula, prefix, objective, temp, isAlwaysSpecifyObject);
        if (!result) return;

        const { resValues, resFormulas } = result;
        editor.edit(edit => {
            edit.replace(editor.selection, [
                `# ${text}`,
                `# ${locale('formula-to-score-operation.complate-text')}`,
                `scoreboard objectives add ${objective} dummy`,
                Array.from(resValues).join('\r\n'),
                '',
                resFormulas.join('\r\n')
            ].join('\r\n'));
        });
    } catch (e) {
        window.showErrorMessage(e.toString());
        codeConsole.appendLine(e.stack ?? e.toString());
    }
}