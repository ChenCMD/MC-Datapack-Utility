import { locale } from '../../../locales';
import { makeExtendQuickPickItem } from '../../../types';
import { numberValidator, listenInput, listenPickItem, parseRadixFloat } from '../../../utils';
import { Replacer } from '../types/Replacer';

const operators = ['+', '-', '*', '/'] as const;
type Operator = typeof operators[number];
const operatorMap = new Map<string, Operator>(operators.map(v => [v, v]));

/*
 * 質問.1 基数
 * 質問.2 値の初期値
 * 質問.3 値を増減させる演算子
 * 質問.4 値の増減量
 * 質問.5 0埋めの桁数
 *
 */
export const serialNumberReplacer: Replacer = async (insertString, insertCount) => {
    const radix = parseInt(await listenInput(locale('serial-number.radix'), v => numberValidator(v, { min: 2, max: 36, allowFloat: false }), 10));
    const start = parseRadixFloat(await listenInput(locale('serial-number.start'), v => numberValidator(v, { radix }), 0), radix);
    const { extend: operator } = await listenPickItem(locale('serial-number.operator'), makeExtendQuickPickItem(operatorMap), false);
    const step = parseRadixFloat(await listenInput(locale('serial-number.step'), v => {
        const res = numberValidator(v, { radix });
        if (res) return res;
        if (operator === '/' && parseRadixFloat(v, radix) === 0) return locale('error.cant-divided-by-zero');
        return undefined;
    }, 1), radix);

    const ans: string[] = [];
    let replaceValue = start;
    ans.push(insertString.replace(/%r/g, replaceValue.toString(radix)));
    for (let i = 1; i < insertCount; i++)
        ans.push(insertString.replace(/%r/g, (replaceValue = safeEval(replaceValue, operator, step)).toString(radix)));
    return ans;
};

function safeEval(a: number, operator: Operator, b: number): number {
    switch (operator) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
    }
}