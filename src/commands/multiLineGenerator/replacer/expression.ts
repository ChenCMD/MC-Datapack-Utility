import { locale } from '../../../locales';
import { ParsingError } from '../../../types';
import { listenInput } from '../../../utils';
import { Replacer } from '../types/Replacer';

export const expressionReplacer: Replacer = async (insertString, insertCount) => {
    const expression = await listenInput(locale('expression.expression'));

    const ans: string[] = [];
    try {
        for (let i = 1; i < insertCount + 1; i++) {
            const replaceData = eval(expression
                .replace(/\s/g, '')
                .replace(/\dx/g, m => `(${m.slice(0, 1)}*x)`)
                .replace(/[^+\-*/]\(/g, m => `${m.slice(0, 1)}*(`)
                .replace(/\^/g, '**')
                .replace(/x/g, i.toString()));
            ans.push(insertString.replace(/%r/g, replaceData));
        }
    } catch (e) {
        throw new ParsingError(locale('error.not-expression'));
    }
    return ans;
};