import { Formula } from '../types/Formula';
import { ssft } from '.';
import { locale } from '../../../locales';
import { ExpectedTokenError, GenerateError } from '../types/Errors';
import { OperateTable } from '../types/OperateTable';
import { config } from '../../../extension';

export function formulaAnalyzer(exp: string, opTable: OperateTable): Formula | string {
    let parts = exp.split(' ');
    const first = parts.shift() ?? '';
    switch (first) {
        case undefined:
            throw new GenerateError(locale('formula-to-score-operation.illegal-formula'));
        // 1文字目が単項演算子かのチェック
        case '+':
            return { front: '', op: opTable.table[ssft('#', opTable)], back: formulaAnalyzer(parts.join(' '), opTable) };
        case '-':
            return { front: '', op: opTable.table[ssft('_', opTable)], back: formulaAnalyzer(parts.join(' '), opTable) };
        case '(':
            const lastClose = parts.lastIndexOf(')');
            if (lastClose === -1)
                // ')'がなければエラー
                throw new ExpectedTokenError(locale('too-much', '\'(\''));
            // 括弧の時は深くする
            const sub = parts.slice(0, lastClose).join(' ');
            parts = parts.slice(lastClose + 1);

            if (!parts[0])
                return formulaAnalyzer(sub, opTable);
            return { front: formulaAnalyzer(sub, opTable), op: opTable.table[ssft(parts.shift(), opTable)], back: formulaAnalyzer(parts.join(' '), opTable) };
        case ')':
            // '('がなければエラー
            throw new ExpectedTokenError(locale('too-much', '\')\''));
        default:
            const scale = config.get<number>('scoreOperation.valueScale') ?? 1;
            const _first = (scale === 1) ? first : { front: first, op: opTable.table[ssft('*', opTable)], back: scale.toString() };
            // 数値と文字の値
            if (!parts[0])
                return _first;

            const _op = opTable.table[ssft(parts.shift(), opTable)];
            const _back = formulaAnalyzer(parts.join(' '), opTable);

            if (_op.identifier === '=' && typeof _back !== 'string')
                return { front: _first, op: _op, back: _back.front };
            if (typeof _back === 'string' || !(_back.op.order < _op.order ||
                (_back.op.order === _op.order && _op.assocLow === 'R')))
                return { front: _first, op: _op, back: _back };

            return { front: { front: _first, op: _op, back: _back.front }, op: _back.op, back: _back.back };
    }
}