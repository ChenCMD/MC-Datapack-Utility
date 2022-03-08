import { locale } from '../../../locales';
import { makeExtendQuickPickItem } from '../../../types';
import { numberValidator, listenInput, listenPickItem, parseRadixFloat, stringValidator } from '../../../utils';
import { Replacer } from '../types/Replacer';

type OpFunc = (a: number, b: number) => number;
const operatorMap = new Map<string, OpFunc>([
    ['+', (a, b) => a + b],
    ['-', (a, b) => a - b],
    ['*', (a, b) => a * b],
    ['/', (a, b) => a / b]
]);

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
    const { label: operator, extend: opFunc } = await listenPickItem(locale('serial-number.operator'), makeExtendQuickPickItem(operatorMap, false), false);
    const step = parseRadixFloat(await listenInput(locale('serial-number.step'), v => {
        const res = numberValidator(v, { radix });
        if (res) return res;
        if (operator === '/' && parseRadixFloat(v, radix) === 0) return locale('error.cant-divided-by-zero');
        return undefined;
    }, 1), radix);
    const paddingLength = parseInt(await listenInput(locale('serial-number.padding-length'), v => numberValidator(v, { radix, min: -1 }), -1), radix);
    const paddingChar = paddingLength >= 1
        ? await listenInput(locale('serial-number.padding-char'), v => stringValidator(v, { minLength: 1, maxLength: 1 }))
        : '0';

    const ans: string[] = [];
    let replaceValue = start;
    for (let i = 0; i < insertCount; i++) {
        ans.push(replaceValue.toString(radix));
        replaceValue = opFunc(replaceValue, step);
    }

    const maxLength = ans.reduce((a, b) => Math.max(a, b.length), 0);

    return (paddingLength !== -1 ? ans.map(str => paddingChar.repeat(maxLength - str.length + paddingLength) + str) : ans)
        .map(v => insertString.replace(/%r/g, v));
};