/**
 * @license
 * MIT License
 *
 * Copyright (c) 2017 spica.tokyo
 *
 * Released under the MIT license
 *
 * https://opensource.org/licenses/mit-license.php
 */

import { Deque } from './Deque';
import { ErrorTemplate } from './interfaces';

const opTable: IOperateTable = {
    table: [
        {
            identifier: '(',
            order: 20,
            type: 'state',
            arity: 0,
            assocLow: ''
        },
        {
            identifier: ')',
            order: 20,
            type: 'state',
            arity: 0,
            assocLow: ''
        },
        {
            identifier: '#',
            order: 16,
            type: 'op',
            arity: 1,
            assocLow: 'R',
            fn: (_l: number | string) => (typeof _l === 'number') ? _l : undefined
        },
        {
            identifier: '_',
            order: 16,
            type: 'op',
            arity: 1,
            assocLow: 'R',
            fn: (_l: number | string) => (typeof _l === 'number') ? -_l : undefined
        },
        {
            identifier: '~',
            order: 16,
            type: 'op',
            arity: 1,
            assocLow: 'R',
            fn: (_l: number | string) => (typeof _l === 'number') ? ~_l : undefined
        },
        {
            identifier: '**',
            order: 15,
            type: 'op',
            arity: 2,
            assocLow: 'R',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l ** _r : undefined
        },
        {
            identifier: '*',
            order: 14,
            type: 'op',
            arity: 2,
            assocLow: 'L',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l * _r : `${_l} * ${_r}`
        },
        {
            identifier: '/',
            order: 14,
            type: 'op',
            arity: 2,
            assocLow: 'L',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l / _r : `${_l} / ${_r}`
        },
        {
            identifier: '%',
            order: 14,
            type: 'op',
            arity: 2,
            assocLow: 'L',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l % _r : `${_l} % ${_r}`
        },
        {
            identifier: '+',
            order: 13,
            type: 'op',
            arity: 2,
            assocLow: 'L',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l + _r : `${_l} + ${_r}`
        },
        {
            identifier: '-',
            order: 13,
            type: 'op',
            arity: 2,
            assocLow: 'L',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l - _r : `${_l} - ${_r}`
        },
        {
            identifier: '<<',
            order: 12,
            type: 'op',
            arity: 2,
            assocLow: 'L',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l << _r : undefined
        },
        {
            identifier: '>>',
            order: 12,
            type: 'op',
            arity: 2,
            assocLow: 'L',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l >> _r : undefined
        },
        {
            identifier: '&',
            order: 9,
            type: 'op',
            arity: 2,
            assocLow: 'L',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l & _r : undefined
        },
        {
            identifier: '^',
            order: 8,
            type: 'op',
            arity: 2,
            assocLow: 'L',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l ^ _r : undefined
        },
        {
            identifier: '|',
            order: 7,
            type: 'op',
            arity: 2,
            assocLow: 'L',
            fn: (_l: number | string, _r: number | string) => (typeof _l === 'number' && typeof _r === 'number') ? _l | _r : undefined
        },
        {
            identifier: '=',
            order: 3,
            type: 'op',
            arity: 2,
            assocLow: 'R',
            fn: (_l: number | string, _r: number | string) => `${_l} = ${_r}`
        }
    ],
    identifiers: [
        '(', ')', '#', '_', '~', '**', '*', '/', '%', '+', '-', '<<', '>>', '&', '^', '|', '='
    ]
};

const table: IOperateElement[] = [];
for (const element of opTable.table) {
    table.push({
        identifier: element.identifier,
        order: element.order,
        type: element.type,
        arity: element.arity,
        assocLow: element.assocLow,
        fn: element.fn ?? (() => { })
    });
}
const scoreTable: IScoreTable = {
    table: [
        {
            identifier: '*',
            type: 'op',
            axiom: '*='
        },
        {
            identifier: '/',
            type: 'op',
            axiom: '/='
        },
        {
            identifier: '%',
            type: 'op',
            axiom: '%='
        },
        {
            identifier: '+',
            type: 'op',
            axiom: '+='
        },
        {
            identifier: '-',
            type: 'op',
            axiom: '-='
        },
        {
            identifier: '=',
            type: 'op',
            axiom: '='
        }
    ],
    identifiers: ['*', '/', '%', '+', '-', '=']
};
interface IOperateElement extends IElementBase {
    identifier: '(' | ')' | '#' | '_' | '~' | '**' | '*' | '/' | '%' | '+' | '-' | '<<' | '>>' | '&' | '^' | '|' | '='
    order: number
    arity: number
    assocLow: '' | 'L' | 'R'
    // eslint-disable-next-line @typescript-eslint/ban-types
    fn?: Function
}

interface IScoreElement extends IElementBase {
    identifier: '*' | '/' | '%' | '+' | '-' | '='
    axiom: string
}

interface IOperateTable extends ITableBase {
    table: IOperateElement[]
}

interface IScoreTable extends ITableBase {
    table: IScoreElement[]
}

interface ITableBase {
    table: IElementBase[]
    identifiers: string[]
}

interface IElementBase {
    identifier: string
    type: 'op' | 'state'
}

interface IQueueElement {
    value: string
    type: 'op' | 'state' | 'num' | 'str' | 'fn'
}

export function mcConvert(formula: string, prefix: string): { resValues: Set<string>, resFormulas: string[] } | undefined {
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

/**
 * Search String From Table
 * @param {string} _str -**_table**内からこのパラメータを探す
 * @param {ReqSSFT} _table このテーブル内から**_str**を探す
 */
export function ssft(_str: string, _table: ITableBase): number {
    return _table.identifiers.indexOf(_str);
}

export function rpnCalculation(rpnExp: string): string | number | undefined {
    // 切り分け実行
    // 式を空白文字かカンマでセパレートして配列化＆これらデリミタを式から消す副作用
    const rpnQueue = new Deque<IQueueElement>();
    for (const elem of rpnExp.split(/\s+|,/))
        fnSplitOperator(elem, rpnQueue, table, opTable);

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
                const operate = table[ssft(elem.value, opTable)];
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

function fnSplitOperator(_val: string, _stack: Deque<IQueueElement>, _table: IElementBase[], _opTable: ITableBase): Deque<IQueueElement> {
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

export function rpnGenerate(exp: string): string {
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
        for (const element of table) {
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
                const opData = table[ssft(op, opTable)];
                if (opeStack[depth].peekFirst() === undefined ||
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    opData.order > table[ssft(opeStack[depth].peekFirst()!, opTable)].order ||
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    (opData.order === table[ssft(opeStack[depth].peekFirst()!, opTable)].order && opData.assocLow === 'R')
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
                        if (table[ssft(ope, opTable)].order < opData.order)
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

export class CalculateUnfinishedError extends ErrorTemplate {}
export class ExpectedTokenError extends ErrorTemplate {}