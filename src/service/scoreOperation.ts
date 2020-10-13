import { window } from 'vscode';
import { rpnGenerate, mcConvert } from '../utils/rpn';
import '../utils/methodExtensions';
import { codeConsole } from '../extension';
import { showInputBox } from '../utils/common';

export async function scoreOperation(): Promise<void> {
    const prefix = '$MCCUTIL_';
    const editor = window.activeTextEditor;
    if (!editor)
        return;

    let text = editor.document.getText(editor.selection);
    // セレクトされていないならInputBoxを表示
    if (text === '') {
        const res = await showInputBox('formula?');
        if (!res || res === '')
            return;
        text = res;
    }

    try {
        const formula = rpnGenerate(text);
        const result = mcConvert(formula, prefix);
        if (!result)
            return;

        editor.edit(edit => {
            edit.replace(editor.selection, [
                `# ${text}`,
                '#if u wish, u can change both <Holder>s\' NAME and the OBJECT _',
                'scoreboard objectives add _ dummy',
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