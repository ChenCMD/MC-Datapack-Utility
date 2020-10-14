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

import { Deque } from '../../../utils/Deque';
import { CalculateUnfinishedError } from '../types/Errors';
import { opTable } from '../types/OperateTable';
import { IQueueElement } from '../types/QueueElement';
import { scoreTable } from '../types/ScoreTable';
import { fnSplitOperator, ssft } from '.';

export function rpnToScoreOperation(formula: string, prefix: string): { resValues: Set<string>, resFormulas: string[] } | undefined {
    let rpnQueue = new Deque<IQueueElement>();
    for (const elem of formula.split(/\s+|,/))
        rpnQueue = fnSplitOperator(elem, rpnQueue, scoreTable.table, scoreTable);

    const calcStack: (number | string)[] = [];
    const resValues = new Set<string>();
    const resFormulas: string[] = [];
    while (rpnQueue.size() > 0) {
        const elem = rpnQueue.removeFirst();
        if (!elem)
            throw Error('element');

        switch (elem.type) {
            case 'num':
                const put = elem.value.indexOf('0x') !== -1 ? parseInt(elem.value, 16) : parseFloat(elem.value);
                calcStack.push(put);
                resValues.add(`scoreboard players set ${prefix}${elem.value} _ ${put}`);
                break;
            case 'str':
                calcStack.push(elem.value);
                break;
            case 'op':
            case 'fn':
                const operate = scoreTable.table[ssft(elem.value, scoreTable)];
                const op = operate.axiom;
                const arg1 = calcStack.pop();
                const arg2 = calcStack.pop();

                if (!arg1 || !arg2)
                    return undefined;

                calcStack.push(arg2.toString());
                resFormulas.push(`scoreboard players operation ${arg2.toString()} _ ${op} ${arg1.toString()} _`);
                break;
        }
    }
    return { resValues, resFormulas };
}

export function rpnCalculate(rpnExp: string): string | number | undefined {
    // 切り分け実行
    // 式を空白文字かカンマでセパレートして配列化＆これらデリミタを式から消す副作用
    const rpnQueue = new Deque<IQueueElement>();
    for (const elem of rpnExp.split(/\s+|,/))
        fnSplitOperator(elem, rpnQueue, opTable.table, opTable);

    // 演算開始
    const calcStack: (number | string)[] = []; // 演算結果スタック
    while (rpnQueue.size() > 0) {
        const elem = rpnQueue.removeFirst();
        if (!elem)
            return;
        switch (elem.type) {
            // 演算項(数値のparse)
            case 'num':
                calcStack.push(
                    elem.value.indexOf('0x') !== -1 ? parseInt(elem.value, 16) : parseFloat(elem.value)
                );
                break;

            // 演算項(文字列)※数値以外のリテラルを扱うような機能は未サポート
            case 'str':
                calcStack.push(elem.value);
                break;

            // 制御文 ※計算時にはないはずなのでwarningを出して無視
            case 'state':
                console.warn(`inclute statement:${elem.value}`);
                break;

            // 演算子・計算機能
            case 'op': case 'fn': {
                const operate = opTable.table[ssft(elem.value, opTable)];
                if (!operate)
                    throw new CalculateUnfinishedError(`not exist operate:${elem.value}`);

                // 演算に必要な数だけ演算項を抽出
                const args: (string | number | undefined)[] = [];
                for (let i = 0; i < operate.arity; i++) {
                    if (calcStack.length > 0)
                        args.unshift(calcStack.pop());
                    else
                        throw new CalculateUnfinishedError('not enough operand');
                }

                // 演算を実行して結果をスタックへ戻す
                const res = operate.fn?.apply(null, args);
                if (res)
                    calcStack.push(res);
                break;
            }
        }
    }

    // 演算子の不足(項が余ってしまう)時に投げられる
    if (calcStack.length !== 1)
        throw new CalculateUnfinishedError('too enough term');

    // 計算結果を戻す
    return calcStack[0];
}