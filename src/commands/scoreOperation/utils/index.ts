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
import { IQueueElement } from '../types/QueueElement';
import { ITableBase, IElementBase } from '../types/TableBase';

/**
 * Search String From Table
 * @param {string} _str -**_table**内からこのパラメータを探す
 * @param {ITablebase} _table このテーブル内から**_str**を探す
 */
export function ssft(_str: string, _table: ITableBase): number {
    return _table.identifiers.indexOf(_str);
}

export function fnSplitOperator(_val: string, _stack: Deque<IQueueElement>, _table: IElementBase[], _opTable: ITableBase): Deque<IQueueElement> {
    if (_val === '')
        return _stack;
    if (ssft(_val, _opTable) !== -1 && !Number.prototype.isValue(_val)) {
        _stack.addLast({ value: _val, type: _table[ssft(_val, _opTable)].type });
        return _stack;
    }

    for (const i in _opTable.identifiers) {
        const piv = _val.indexOf(_table[i].identifier);
        if (piv !== -1) {
            _stack = fnSplitOperator(_val.substring(0, piv), _stack, _table, _opTable);
            _stack = fnSplitOperator(_val.substring(piv, piv + _opTable.identifiers[i].length), _stack, _table, _opTable);
            _stack = fnSplitOperator(_val.substring(piv + _opTable.identifiers[i].length), _stack, _table, _opTable);
            return _stack;
        }
    }

    _stack.addLast(Number.prototype.isValue(_val) ? { value: _val, type: 'num' } : { value: _val, type: 'str' });
    return _stack;
}