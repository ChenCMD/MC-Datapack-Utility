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
import { QueueElement } from '../types/QueueElement';
import { TableBase } from '../types/TableBase';
import { showInputBox } from '../../../utils/common';
import { locale } from '../../../locales';
import { workspace } from 'vscode';

/**
 * Search String From Table
 * @param {string} _str -**_table**内からこのパラメータを探す
 * @param {Tablebase} _table このテーブル内から**_str**を探す
 */
export function ssft(_str: string, _table: TableBase): number {
    return _table.identifiers.indexOf(_str);
}

export async function fnSplitOperator(_val: string, _stack: Deque<QueueElement>, _opTable: TableBase, _objective: string): Promise<Deque<QueueElement>> {
    // _val が空の文字列の時は何も行なわれない
    if (_val === '')
        return _stack;
    // _val が _opTable に含まれるとき、その演算子を _stack に追加する
    if (ssft(_val, _opTable) !== -1 && !Number.prototype.isValue(_val)) {
        _stack.addLast({ value: _val, objective: '', type: _opTable.table[ssft(_val, _opTable)].type });
        return _stack;
    }

    // _opTable で定義される演算子のうち、どれかが _val に含まれている場合
    // その演算子以前、その演算子、その演算子以後に分けて再帰的に関数を実行する
    for (const i in _opTable.identifiers) {
        const piv = _val.indexOf(_opTable.table[i].identifier);
        if (piv !== -1) {
            _stack = await fnSplitOperator(_val.substring(0, piv), _stack, _opTable, _objective);
            _stack = await fnSplitOperator(_val.substring(piv, piv + _opTable.identifiers[i].length), _stack, _opTable, _objective);
            _stack = await fnSplitOperator(_val.substring(piv + _opTable.identifiers[i].length), _stack, _opTable, _objective);
            return _stack;
        }
    }

    if (Number.prototype.isValue(_val)) {
        _stack.addLast({ value: _val, objective: _objective, type: 'num' });
    } else {
        let obj = _objective;
        if (workspace.getConfiguration('mcdutil').get<boolean>('scoreOperation.isAlwaysSpecifyObject', true))
            obj = await showInputBox(locale('formula-to-score-operation.specifying-object', _val)) ?? _objective;

        _stack.addLast({ value: _val, objective: obj, type: 'str' });
    }
    return _stack;
}