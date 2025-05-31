import { ElementBase, TableBase } from './TableBase'

export type OperateTable = TableBase<OperateElement>

export interface OperateElement extends ElementBase {
    identifier: string
    order: number
    arity: number
    assocLow: '' | 'L' | 'R'
    // eslint-disable-next-line @typescript-eslint/ban-types
    fn?: Function
    destination?: Destination
}

interface Destination {
    args: string[]
    namely: string
}

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
export const opTable: OperateTable = {
    '(': {
        identifier: '(',
        order: 20,
        type: 'state',
        arity: 0,
        assocLow: ''
    },
    ')': {
        identifier: ')',
        order: 20,
        type: 'state',
        arity: 0,
        assocLow: ''
    },
    '*': {
        identifier: '*',
        order: 14,
        type: 'op',
        arity: 2,
        assocLow: 'L',
        fn: (_l: number | string, _r: number | string): number | string => (typeof _l === 'number' && typeof _r === 'number') ? _l * _r : `${_l} * ${_r}`
    },
    '/': {
        identifier: '/',
        order: 14,
        type: 'op',
        arity: 2,
        assocLow: 'L',
        fn: (_l: number | string, _r: number | string): number | string => (typeof _l === 'number' && typeof _r === 'number') ? _l / _r : `${_l} / ${_r}`
    },
    '%': {
        identifier: '%',
        order: 14,
        type: 'op',
        arity: 2,
        assocLow: 'L',
        fn: (_l: number | string, _r: number | string): number | string => (typeof _l === 'number' && typeof _r === 'number') ? _l % _r : `${_l} % ${_r}`
    },
    '+': {
        identifier: '+',
        order: 13,
        type: 'op',
        arity: 2,
        assocLow: 'L',
        fn: (_l: number | string, _r: number | string): number | string => (typeof _l === 'number' && typeof _r === 'number') ? _l + _r : `${_l} + ${_r}`
    },
    '-': {
        identifier: '-',
        order: 13,
        type: 'op',
        arity: 2,
        assocLow: 'L',
        fn: (_l: number | string, _r: number | string): number | string => (typeof _l === 'number' && typeof _r === 'number') ? _l - _r : `${_l} - ${_r}`
    },
    '=': {
        identifier: '=',
        order: 3,
        type: 'op',
        arity: 2,
        assocLow: 'R',
        fn: (_l: number | string, _r: number | string): string => `${_l} = ${_r}`
    },
    '+=': {
        identifier: '+=',
        order: 3,
        type: 'op',
        arity: 2,
        assocLow: 'R'
    },
    '-=': {
        identifier: '-=',
        order: 3,
        type: 'op',
        arity: 2,
        assocLow: 'R'
    },
    '*=': {
        identifier: '*=',
        order: 3,
        type: 'op',
        arity: 2,
        assocLow: 'R'
    },
    '/=': {
        identifier: '/=',
        order: 3,
        type: 'op',
        arity: 2,
        assocLow: 'R'
    },
    '%=': {
        identifier: '%=',
        order: 3,
        type: 'op',
        arity: 2,
        assocLow: 'R'
    },
    'if(': {
        identifier: 'if(',
        order: 18,
        type: 'op',
        arity: 3,
        assocLow: 'R',
        destination: {
            args: [],
            namely: 'if'
        }
    }
}