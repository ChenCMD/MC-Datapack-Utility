import { locale } from '../../../locales';
import { makeExtendQuickPickItem } from '../../../types';
import { numberValidator, listenInput, listenPickItem, parseRadixFloat, stringValidator } from '../../../utils';
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
    const { extend: operator } = await listenPickItem(locale('serial-number.operator'), makeExtendQuickPickItem(operatorMap, false), false);
    const step = parseRadixFloat(await listenInput(locale('serial-number.step'), v => {
        const res = numberValidator(v, { radix });
        if (res) return res;
        if (operator === '/' && parseRadixFloat(v, radix) === 0) return locale('error.cant-divided-by-zero');
        return undefined;
    }, 1), radix);
    const paddingLength = parseInt(await listenInput(locale('serial-number.padding-length'), v => numberValidator(v, { radix, min: 0 }), 0), radix);
    const paddingChar = paddingLength >= 1
        ? await listenInput(locale('serial-number.padding-char'), v => stringValidator(v, { minLength: 1, maxLength: 1 }))
        : '0';

    const ans: string[] = [];
    let replaceValue = start;
    for (let i = 0; i < insertCount; i++) {
        const replaceStr = replaceValue.toString(radix);
        ans.push(insertString.replace(/%r/g, replaceStr.length <= paddingLength
            ? `${paddingChar.repeat(paddingLength)}${replaceStr}`.slice(-paddingLength)
            : replaceStr
        ));
        replaceValue = safeEval(replaceValue, operator, step);
    }
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