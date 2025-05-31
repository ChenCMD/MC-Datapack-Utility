/**
 * @license
 * MIT License
 *
 * Copyright (c) 2017 spica.tokyo
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @version 1.0.0
*/

import { OperateTable } from '../types/OperateTable';
import { QueueElement } from '../types/QueueElement';
import { formulaToQueue } from '.';
import { locale } from '../../../locales';
import { Formula, IfFormula } from '../types/Formula';
import { codeConsole } from '../../../extension';
import { GenerateError, CalculateUnfinishedError } from '../../../types/Error';
import { ScoreOperationConfig } from '../../../types/Config';
import { Deque } from '../../../utils';

export const rpnToScoreOperation = async (formula: Formula | string, config: ScoreOperationConfig, funcs: IfFormula[], opTable: OperateTable, _enteredValues?: Set<string>): Promise<{ resValues: Set<string>, resFormulas: string[] } | undefined> => {
    const { prefix, objective, temp } = config;

    const enteredValues = _enteredValues ?? new Set<string>();
    const rpnQueue = new Deque<QueueElement>();
    const res = await formulaToQueue(formula, rpnQueue, config, enteredValues);
    if (!res) return undefined;

    const calcStack: QueueElement[] = [];
    const resValues = new Set<string>();
    const resFormulas: string[] = [];

    // funcs とあるが、今はif文だけ。
    for (let i = 0; i < funcs.length; i++) {
        const cases: { true: string[], false: string[] } = { true: [], false: [] };
        let j = 0;
        // if文の条件からexecute式の引数に変換
        for (const e of funcs[i].condition) {
            const source = await rpnToScoreOperation({ front: e.front, op: opTable['='], back: `${prefix}if_${i + 1}_${j++}` }, config, [], opTable, enteredValues);
            if (source) {
                source.resValues.forEach(v => resValues.add(v));
                resFormulas.push(...source.resFormulas);
            }

            const destination = await rpnToScoreOperation({ front: e.back, op: opTable['='], back: `${prefix}if_${i + 1}_${j++}` }, config, [], opTable, enteredValues);
            if (destination) {
                destination.resValues.forEach(v => resValues.add(v));
                resFormulas.push(...destination.resFormulas);
            }

            cases.true.push(`${(e.default) ? 'if' : 'unless'} score ${prefix}if_${i + 1}_${j - 1} ${objective} ${e.op.replaceTo} ${prefix}if_${i + 1}_${j} ${objective}`);
            cases.false.push(`${(!e.default) ? 'if' : 'unless'} score ${prefix}if_${i + 1}_${j - 1} ${objective} ${e.op.replaceTo} ${prefix}if_${i + 1}_${j} ${objective}`);
        }

        // if文のthen/else節から、scoreboard operationに変換する
        const THEN = await rpnToScoreOperation({ front: funcs[i].then, op: opTable['='], back: `${prefix}if_${i + 1}` }, config, [], opTable, enteredValues);
        if (THEN) {
            THEN.resValues.forEach(v => resValues.add(v));
            THEN.resFormulas.forEach(v => resFormulas.push(`execute ${cases.true.join(' ')} run ${v}`));
        }

        const ELSE = await rpnToScoreOperation({ front: funcs[i].else, op: opTable['='], back: `${prefix}if_${i + 1}` }, config, [], opTable, enteredValues);
        if (ELSE) {
            ELSE.resValues.forEach(v => resValues.add(v));
            ELSE.resFormulas.forEach(v => resFormulas.push(`execute ${cases.false.join(' ')} run ${v}`));
        }
        resFormulas.push('');
    }

    let tempCount = 0;
    while (rpnQueue.size() > 0) {
        const elem = rpnQueue.removeFirst();

        switch (elem.type) {
            case 'num':
                const put = elem.value.startsWith('0x') ? parseInt(elem.value, 16) : parseFloat(elem.value);
                calcStack.push({ value: `${prefix}${put}`, objective: `${objective}`, type: 'num' });
                resValues.add(`scoreboard players set ${prefix}${elem.value} ${objective} ${put}`);
                break;
            case 'str':
                calcStack.push(elem);
                break;
            case 'op':
            case 'fn':
                const arg1 = calcStack.pop();
                const arg2 = calcStack.pop();

                if (!arg1 || !arg2)
                    throw new GenerateError(locale('formula-to-score-operation.illegal-formula'));

                // arg2 が「${prefix}${temp}」で表される数でないなら登録
                if (arg2.value.match(prefix + /\d/) || !arg2.value.startsWith(`${prefix}${temp}`)) {
                    resFormulas.push(`scoreboard players operation ${prefix}${temp}${++tempCount} ${objective} = ${arg2.value} ${arg2.objective}`);
                    arg2.value = `${prefix}${temp}${tempCount}`;
                }

                if (elem.value.endsWith('=')) {
                    resFormulas.push(`scoreboard players operation ${arg1.value} ${arg1.objective} ${elem.value} ${arg2.value} ${arg2.objective}`);
                } else {
                    resFormulas.push(`scoreboard players operation ${arg2.value} ${arg2.objective} ${elem.value}= ${arg1.value} ${arg1.objective}`);
                    calcStack.push(arg2);
                }
                break;
        }
    }
    return { resValues, resFormulas };
};

export async function rpnCalculate(rpnExp: string, opTable: OperateTable, config: ScoreOperationConfig): Promise<string | number | undefined> {
    // 切り分け実行
    // 式を空白文字かカンマでセパレートして配列化＆これらデリミタを式から消す副作用
    const rpnQueue = new Deque<QueueElement>();
    for (const elem of rpnExp.split(/\s+|,/)) {
        const res = await formulaToQueue(elem, rpnQueue, config, new Set<string>());
        if (!res) return undefined;
    }
    // 演算開始
    const calcStack: (number | string)[] = []; // 演算結果スタック
    while (rpnQueue.size() > 0) {
        const elem = rpnQueue.removeFirst();
        switch (elem.type) {
            // 演算項(数値のparse)
            case 'num':
                calcStack.push(elem.value.indexOf('0x') !== -1 ? parseInt(elem.value, 16) : parseFloat(elem.value));
                break;

            // 演算項(文字列)※数値以外のリテラルを扱うような機能は未サポート
            case 'str':
                calcStack.push(elem.value);
                break;

            // 制御文 ※計算時にはないはずなのでwarningを出して無視
            case 'state':
                codeConsole.appendLine(`[WARN] include statement:${elem.value}`);
                break;

            // 演算子・計算機能
            case 'op':
            case 'fn':
                const operate = opTable[elem.value];
                if (!operate)
                    throw new CalculateUnfinishedError(locale('error.not-exist', locale('operator'), elem.value));

                // 演算に必要な数だけ演算項を抽出
                const args = new Deque<string | number | undefined>();
                for (let i = 0; i < operate.arity; i++) {
                    if (calcStack.length > 0)
                        args.addFirst(calcStack.pop());
                    else
                        throw new CalculateUnfinishedError(locale('formula-to-score-operation.not-enough-operand'));
                }

                // 演算を実行して結果をスタックへ戻す
                const res = operate.fn?.apply(null, Array.from(args));
                if (res)
                    calcStack.push(res);
                break;
        }
    }

    // 演算子の不足(項が余ってしまう)時に投げられる
    if (calcStack.length !== 1)
        throw new CalculateUnfinishedError(locale('formula-to-score-operation.too-enough-term'));

    // 計算結果を戻す
    return calcStack[0];
}
