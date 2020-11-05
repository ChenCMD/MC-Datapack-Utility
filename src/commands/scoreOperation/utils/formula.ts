import { Formula } from '../types/Formula';
import { ssft } from '.';
import { locale } from '../../../locales';
import { ExpectedTokenError } from '../types/Errors';
import { OperateElement, OperateTable } from '../types/OperateTable';

export function formulaAnalyzer(exp: string, opTable: OperateTable): Formula | string {
    const parts = exp.split(' ');
    const first = parts.shift() ?? '';
    let _op: OperateElement;
    switch (first) {
        // 1文字目が単項演算子かのチェック
        case '+':
            return { front: '', op: opTable.table[ssft('#', opTable)], back: formulaAnalyzer(parts.join(' '), opTable) };
        case '-':
            return { front: '', op: opTable.table[ssft('_', opTable)], back: formulaAnalyzer(parts.join(' '), opTable) };
        case '(':
            // 括弧の時は深くする
            const _front = parts.shift() ?? '';
            _op = opTable.table[ssft(parts.shift(), opTable)];
            if (_op === opTable.table[ssft(')', opTable)]) {
                // '(', _front, ')', external, ...
                const external = parts.shift();
                if (!external)
                    return _front;
                return { front: _front, op: opTable.table[ssft(external, opTable)], back: formulaAnalyzer(parts.join(' '), opTable) };
            }

            const _str = parts.join(' ');
            const index = _str.lastIndexOf(')');
            if (index === -1)
                // ')'がなければエラー
                throw new ExpectedTokenError(locale('too-much', '\'(\''));

            const nestFormula = formulaAnalyzer(_str.substring(0, index), opTable);
            const _external = _str.substr(index).split(' ');
            _external.shift();
            const extOp = opTable.table[ssft(_external.shift(), opTable)];

            // '(', _front, _op, nestFormula, ')', extOp, _external[1, 2, ...]
            const back = formulaAnalyzer(_external.join(' '), opTable);
            if ((typeof back === 'string') || back.op.order > _op.order ||
                (back.op.order === _op.order && back.op.assocLow === 'R'))
                return { front: { front: _front, op: _op, back: nestFormula }, op: extOp, back: back };

            return { front: { front: { front: _front, op: _op, back: nestFormula }, op: extOp, back: back.front }, op: back.op, back: back.back };
        case ')':
            // '('がなければエラー
            throw new ExpectedTokenError(locale('too-much', '\')\''));
        default:
            // 数値と文字の値
            _op = opTable.table[ssft(parts.shift(), opTable)];
            if (!_op) return first;

            const _back = formulaAnalyzer(parts.join(' '), opTable);

            if ((typeof _back === 'string') || _back.op.order > _op.order ||
                (_back.op.order === _op.order && _back.op.assocLow === 'R'))
                return { front: first, op: _op, back: _back };

            return { front: { front: first, op: _op, back: _back.front }, op: _back.op, back: _back.back };
    }
}

export function formulaDefroster(exp: Formula | string, opTable: OperateTable): string {
    if (typeof exp === 'string')
        return exp;
    const polish = []; // parse結果格納用
    if (typeof exp.front === 'string')
        polish.push(exp.front);
    else
        polish.push(formulaDefroster(exp.front, opTable));
    if (typeof exp.back === 'string')
        polish.push(exp.back);
    else
        polish.push(formulaDefroster(exp.back, opTable));

    polish.push(exp.op.identifier);
    return polish.join(' ');
}