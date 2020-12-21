import '../../utils/methodExtensions';
import { codeConsole, config } from '../../extension';
import { getTextEditor, listenInput, showError } from '../../utils/vscodeWrapper';
import { rpnToScoreOperation } from './utils/converter';
import { formulaAnalyzer } from './utils/formula';
import { locale } from '../../locales';
import { opTable } from './types/OperateTable';
import { NotOpenTextDocumentError, UserCancelledError } from '../../types/Error';
import { IfFormula } from './types/Formula';

export async function scoreOperation(): Promise<void> {
    const { prefix, objective, temp, forceInputType, isAlwaysSpecifyObject } = config.scoreOperation;
    try {
        const editor = getTextEditor();

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
                showError(locale('formula-to-score-operation.not-selection'));
                return;
            }
            const res = await listenInput(locale('formula-to-score-operation.formula'));
            if (!res) return;
            text = res;
        }

        const ifStates: IfFormula[] = [];
        // 最後に代入を行うので、v = f を f = v の形にする。
        const formula = formulaAnalyzer(text.split(' = ').reverse().join(' = ').split(' '), opTable, ifStates);
        const result = await rpnToScoreOperation(formula, prefix, objective, temp, ifStates, opTable, isAlwaysSpecifyObject);
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
    } catch (error) {
        if (error instanceof UserCancelledError || error instanceof NotOpenTextDocumentError) return;
        if (error instanceof Error) showError(error.message);
        else showError(error.toString());
        codeConsole.appendLine(error.stack ?? error.toString());
    }
}