import { locale } from '../../../locales';
import { makeExtendQuickPickItem } from '../../../types';
import { numberValidator, listenInput, listenPickItem } from '../../../utils';
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
    const radix = parseInt(await listenInput(locale('serial-number.radix'), v => numberValidator(v, 10, { min: 2, max: 36 })));
    const start = parseInt(await listenInput(locale('serial-number.start'), v => numberValidator(v, radix)), radix);
    const { extend: operator } = await listenPickItem(locale('serial-number.operator'), makeExtendQuickPickItem(operatorMap), false);
    const step = parseInt(await listenInput(locale('serial-number.step'), v => numberValidator(v, radix, { min: 1 })), radix);

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