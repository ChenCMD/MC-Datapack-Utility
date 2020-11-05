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

import { Deque } from '../../../types/Deque';
import { CalculateUnfinishedError, GenerateError } from '../types/Errors';
import { OperateTable } from '../types/OperateTable';
import { QueueElement } from '../types/QueueElement';
import { scoreTable } from '../types/ScoreTable';
import { fnSplitOperator, ssft } from '.';
import { locale } from '../../../locales';

export async function rpnToScoreOperation(formula: string, prefix: string, objective: string, temp: string): Promise<{ resValues: Set<string>, resFormulas: string[] }> {
    let rpnQueue = new Deque<QueueElement>();
    for (const elem of formula.split(/\s+|,/))
        rpnQueue = await fnSplitOperator(elem, rpnQueue, scoreTable, objective);

    const calcStack: QueueElement[] = [];
    const resValues = new Set<string>();
    const resFormulas: string[] = [];
    let tempCount = 0;
    while (rpnQueue.size() > 0) {
        const elem = rpnQueue.removeFirst();

        switch (elem.type) {
            case 'num':
                const put = elem.value.indexOf('0x') !== -1 ? parseInt(elem.value, 16) : parseFloat(elem.value);
                calcStack.push({ value: `${prefix}${put}`, objective: `${objective}`, type: 'num' });
                resValues.add(`scoreboard players set ${prefix}${elem.value} ${objective} ${put}`);
                break;
            case 'str':
                calcStack.push(elem);
                break;
            case 'op':
            case 'fn':
                const op = scoreTable.table[ssft(elem.value, scoreTable)].axiom;
                for (const _op of op) {
                    const arg1 = calcStack.pop();
                    const arg2 = calcStack.pop();

                    if (!arg1 || !arg2)
                        throw new GenerateError(locale('formula-to-score-operation.illegal-formula'));

                    // arg2 が「${prefix}${temp}」で表される数でないなら登録
                    if (arg2.value.indexOf(`${prefix}${temp}`) === -1) {
                        resFormulas.push(`scoreboard players operation ${prefix}${temp}${++tempCount} ${objective} = ${arg2.value} ${arg2.objective}`);
                        arg2.value = `${prefix}${temp}${tempCount}`;
                    }

                    // 「(被演算数) (演算子) (加演算数)」という関係として、
                    // 「被演算数」が arg1 であるとき _op.former: true
                    // 「加演算数」が arg2 であるとき _op.latter: true
                    // ∴・「arg1 (演算子) arg2」のとき、_op.former も _op.latter も true
                    //   ・「arg2 (演算子) arg1」のとき、_op.former も _op.latter も false
                    const _f = (_op.former) ? arg1 : arg2;
                    const _l = (_op.latter) ? arg2 : arg1;
                    resFormulas.push(`scoreboard players operation ${_f.value} ${_f.objective} ${_op.op} ${_l.value} ${_l.objective}`);

                    if (!_op.former || !_op.latter)
                        calcStack.push(arg2);
                }
                break;
        }
    }
    return { resValues, resFormulas };
}

export async function rpnCalculate(rpnExp: string, opTable: OperateTable): Promise<string | number | undefined> {
    // 切り分け実行
    // 式を空白文字かカンマでセパレートして配列化＆これらデリミタを式から消す副作用
    const rpnQueue = new Deque<QueueElement>();
    for (const elem of rpnExp.split(/\s+|,/))
        await fnSplitOperator(elem, rpnQueue, opTable, '');

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
                console.warn(`inclute statement:${elem.value}`);
                break;

            // 演算子・計算機能
            case 'op':
            case 'fn':
                const operate = opTable.table[ssft(elem.value, opTable)];
                if (!operate)
                    throw new CalculateUnfinishedError(locale('formula-to-score-operation.not-exist-operate', elem.value));

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