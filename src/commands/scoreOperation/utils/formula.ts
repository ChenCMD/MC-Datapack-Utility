import { Formula } from '../types/Formula';
import { ssft } from '.';
import { locale } from '../../../locales';
import { OperateElement, OperateTable } from '../types/OperateTable';
import { config } from '../../../extension';
import { GenerateError, ExpectedTokenError } from '../../../types/Error';

export function formulaAnalyzer(exp: string, opTable: OperateTable): Formula | string {
    let parts = exp.split(' ');
    const first = parts.shift();
    if (!first)
        throw new GenerateError(locale('formula-to-score-operation.illegal-formula'));

    let func: OperateElement | undefined;
    for (const e of opTable.table) {
        if (e.identifier === first)
            func = e;
    }

    // firstがopTableに登録されていなければ、ただの文字列であると考える
    if (!func) {

        const scale = config.scoreOperation.valueScale;
        const front = (scale === 1) ? first : { front: first, op: opTable.table[ssft('*', opTable)], back: scale.toString() };
        // 数値と文字の値
        if (!parts[0])
            return front;

        const op = opTable.table[ssft(parts.shift(), opTable)];
        const back = formulaAnalyzer(parts.join(' '), opTable);

        if (op.identifier === '=' && typeof back !== 'string')
            return { front, op, back: back.front };
        if (typeof back === 'string' || !(back.op.order < op.order ||
            (back.op.order === op.order && op.assocLow === 'R')))
            return { front, op, back };

        return { front: { front, op, back: back.front }, op: back.op, back: back.back };
    }

    // 関数と一部の演算子のみが、1節目に許される
    switch (func.identifier) {
        // 1文字目が単項演算子かのチェック
        case '+':
            return { front: '', op: opTable.table[ssft('#', opTable)], back: formulaAnalyzer(parts.join(' '), opTable) };
        case '-':
            return { front: '', op: opTable.table[ssft('_', opTable)], back: formulaAnalyzer(parts.join(' '), opTable) };
        // 括弧の時は深くする
        case '(':
            const lastClose = parts.lastIndexOf(')');
            if (lastClose === -1)
                // ')'がなければエラー
                throw new ExpectedTokenError(locale('too-much', '\'(\''));
            const sub = parts.slice(0, lastClose).join(' ');
            parts = parts.slice(lastClose + 1);

            if (!parts[0]) return formulaAnalyzer(sub, opTable);
            return { front: formulaAnalyzer(sub, opTable), op: opTable.table[ssft(parts.shift(), opTable)], back: formulaAnalyzer(parts.join(' '), opTable) };
        case ')':
            // '('がなければエラー
            throw new ExpectedTokenError(locale('too-much', '\')\''));
        default:
            if (!func.identifier.match(/^\S+\($/) || !func.destination)
                throw new GenerateError(locale('formula-to-score-operation.illegal-formula'));
    }

    const nested = parts.slice(0, parts.lastIndexOf(')'));
    parts = parts.slice(parts.lastIndexOf(')') + 1);

    const subArr: string[][] = [];
    let separation = 0;
    let _str: string;

    // exp =    f( f( f( 1 , 2 ) , f( 3 , 4 ) ) , 5 )
    // nested = ["f(" "f(" "1" "," "2" ")" "," "f(" "3" "," "4" ")" ")" "," "5"]
    let i = 0;
    while (i < func.arity - 1) {
        separation = nested.indexOf(',', separation + 1);
        _str = nested.slice(0, separation).join(' ');
        subArr[i] = _str.split(' ');
        if (_str.split('(').length === _str.split(')').length
            && _str.lastIndexOf('(') <= _str.lastIndexOf(')'))
            i++;
    }
    subArr.push(nested.slice(separation + 1));

    if(!func.destination)
        throw new ExpectedTokenError(locale('formula-to-score-operation.illegal-expression', func.identifier));

    const nameElem = func.destination.namely.split(' ');
    func.destination.args.forEach((e, j) => {
        for (let argIndex = nameElem.indexOf(e); argIndex !== -1; argIndex = nameElem.indexOf(e, argIndex + 1))
            nameElem[argIndex] = formulaToString(formulaAnalyzer(subArr[j].join(' '), opTable));
    });
    const _exp = `( ${nameElem.join(' ')} )`;

    if (!parts[0])
        return formulaAnalyzer(_exp, opTable);
    return { front: formulaAnalyzer(_exp, opTable), op: opTable.table[ssft(parts.shift(), opTable)], back: formulaAnalyzer(parts.join(' '), opTable) };
}

function formulaToString(formula: Formula | string): string {
    if (typeof formula === 'string')
        return formula;
    return `${formulaToString(formula.front)} ${formula.op.identifier} ${formulaToString(formula.back)}`;
}