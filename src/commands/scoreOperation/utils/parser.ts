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
import { ExpectedTokenError } from '../types/Errors';
import { opTable } from '../types/OperateTable';
import { ssft } from '.';

export function rpnParse(exp: string): string {
    const polish = []; // parse結果格納用
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opeStack = [new Deque<string | undefined>()]; // 演算子スタック
    let depth = 0; // 括弧のネスト深度
    let unary = true; // 単項演算子チェック(正負符号等)

    do {
        // 先頭の空白文字とカンマを消去
        exp = exp.replace(/^(\s|,)+/, '');
        if (exp.length === 0)
            break;

        // 演算子スタック
        opeStack[depth] = opeStack[depth] || new Deque();

        // 数値抽出(整数・小数・16進数)
        const numberLiteral = exp.match(/(^0x[0-9a-f]+)|(^[0-9]+(\.[0-9]+)?)/i)?.[0];
        if (numberLiteral) {
            polish.push(numberLiteral.indexOf('0x') === 0 ? parseInt(numberLiteral, 16) : parseFloat(numberLiteral));
            exp = exp.slice(numberLiteral.length);
            unary = false;
            continue;
        }

        // 演算子抽出
        let op = null;
        for (const element of opTable.table) {
            if (exp.startsWith(element.identifier)) {
                op = element.identifier;
                exp = exp.slice(element.identifier.length);
                break;
            }
        }

        if (!op) {
            const variableLiteral = exp.match(/^([a-z]+)/i)?.[0];
            if (variableLiteral) {
                polish.push(variableLiteral);
                exp = exp.slice(variableLiteral.length);
                unary = false;
                continue;
            }
            throw new ExpectedTokenError(`illegal expression: ${exp.slice(0, 10)} ...`);
        }

        // スタック構築
        // ・各演算子の優先順位
        // ・符合の単項演算子化
        switch (op) {
            // 括弧はネストにするので特別
            case '(':
                depth++;
                unary = true;
                break;
            case ')':
                for (const stackOp of opeStack[depth]) { // 演算子スタックを全て処理
                    polish.push(stackOp);
                }
                opeStack[depth].clear();
                if (--depth < 0) {
                    // 括弧閉じ多すぎてエラー
                    throw new ExpectedTokenError('too much \')\'');
                }
                unary = false; // 括弧を閉じた直後は符号(単項演算子)ではない
                break;
            default:
                // +符号を#に、-符号を_に置換
                if (unary) {
                    if (op === '+')
                        op = '#';
                    else if (op === '-')
                        op = '_';
                }

                // 演算子スタックの先頭に格納
                // ・演算子がまだスタックにない
                // ・演算子スタックの先頭にある演算子より優先度が高い
                // ・演算子スタックの先頭にある演算子と優先度が同じでかつ結合法則がright to left
                const opData = opTable.table[ssft(op, opTable)];
                if (opeStack[depth].peekFirst() === undefined ||
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    opData.order > opTable.table[ssft(opeStack[depth].peekFirst()!, opTable)].order ||
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    (opData.order === opTable.table[ssft(opeStack[depth].peekFirst()!, opTable)].order && opData.assocLow === 'R')
                ) {
                    opeStack[depth].addFirst(op);
                } else {
                    // 式のスタックに演算子を積む
                    // 演算子スタックの先頭から、優先順位が同じか高いものを全て抽出して式に積む
                    // ※優先順位が同じなのは結合法則がright to leftのものだけスタックに積んである
                    // 演算優先度が、スタック先頭の演算子以上ならば、続けて式に演算子を積む
                    while (opeStack[depth].size() > 0) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const ope = opeStack[depth].removeFirst()!;
                        polish.push(ope);
                        if (opTable.table[ssft(ope, opTable)].order < opData.order)
                            break;
                    }
                    opeStack[depth].addFirst(op);
                }
                unary = true;
                break;
        }
    } while (exp.length > 0);

    if (depth > 0)
        throw new ExpectedTokenError('too much \'(\'');
    while (opeStack[depth].size() > 0)
        polish.push(opeStack[depth].removeFirst());
    return polish.join(' ');
}