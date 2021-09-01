import { codeConsole } from '../../extension';
import { locale } from '../../locales';
import { makeExtendQuickPickItem, UserCancelledError } from '../../types';
import { FeatureContext } from '../../types/FeatureContext';
import { getTextEditor, numberValidator, listenInput, listenPickItem, showError, stringValidator } from '../../utils';
import { getReplacerMap } from './replacer';

/*
 * 質問.1 挿入する文字列
 * 質問.2 if (選択場所が一つ) 挿入する回数
 * 質問.3 置換データの種類の選択 (文字列 or 連番 or 関数)
 *
 * 挿入に関する仕様:
 * 選択場所が一つかつ選択範囲が0の場合 -> その行の次の行に挿入
 * 選択場所が一つかつ選択範囲が存在する場合 -> その範囲にreplace
 * 選択場所が二つ以上 -> その場にreplace
 *
 */
export async function generateMultiLine(ctx: FeatureContext): Promise<void> {
    try {
        const textEditor = getTextEditor();
        const { selections } = textEditor;

        // 挿入する文字列の質問
        const insertString = await listenInput(locale('insert-string'), v => stringValidator(v, { emptyMessage: locale('error.input-blank', locale('insert-string')) }), '%r');
        // 挿入する回数
        const insertCount = selections.length === 1
            ? parseInt(await listenInput(locale('insert-count'), v => numberValidator(v, { min: 1 })))
            : selections.length;
        // 置換方法の選択
        const { extend: replacer } = await listenPickItem('', makeExtendQuickPickItem(getReplacerMap()), false);
        // 置換方法毎の処理
        const editData = await replacer(insertString, insertCount, ctx);
        // 置換
        textEditor.edit(builder => {
            if (selections.length === 1) {
                builder.replace(selections[0], editData.join('\n'));
            } else {
                if (selections.length === editData.length)
                    selections.forEach((selection, i) => builder.replace(selection, editData[i]));
                else
                    selections.forEach(selection => builder.replace(selection, editData.join('\n')));
            }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error instanceof UserCancelledError) return;
        if (error instanceof Error) showError(error.message);
        else showError(error.toString());
        codeConsole.appendLine(error.stack ?? error.toString());
    }
}