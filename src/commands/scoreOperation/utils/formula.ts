import { Formula, IfFormula } from '../types/Formula';
import { locale } from '../../../locales';
import { OperateTable } from '../types/OperateTable';
import { GenerateError, ParsingError } from '../../../types/Error';
import { ConditionExp, conditionExpTable } from '../types/ConditionExpTable';

export function formulaAnalyzer(exp: string[], opTable: OperateTable, funcs: IfFormula[], scale: number): Formula | string {
    const first = exp.shift();
    if (!first)
        throw new GenerateError(locale('formula-to-score-operation.illegal-formula'));

    const func = opTable[first];

    // firstがopTableに登録されていなければ、ただの文字列であると考える
    if (!func) {
        const front = (scale === 1) ? first : { front: first, op: opTable['*'], back: scale.toString() };
        // 数値と文字の値
        if (!exp[0])
            return front;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const toBeOp = exp.shift()!;
        const op = opTable[toBeOp];
        if (!op) throw new GenerateError(locale('error.not-exist', locale('operator'), toBeOp));

        const back = formulaAnalyzer(exp, opTable, funcs, scale);

        // 最後に = の処理を行うので、v = f を f = v の形にする。
        if (op.identifier.endsWith('='))
            return { front: back, op, back: front };

        if (typeof back === 'string' || !(back.op.order < op.order ||
            (back.op.order === op.order && op.assocLow === 'R')))
            return { front, op, back };

        return { front: { front, op, back: back.front }, op: back.op, back: back.back };
    }

    // 関数と一部の演算子のみが、1節目に許される
    switch (func.identifier) {
        // 1文字目が単項演算子かのチェック
        case '+':
            return formulaAnalyzer(['0', '+', ...exp], opTable, funcs, scale);
        case '-':
            return formulaAnalyzer(['0', '-', ...exp], opTable, funcs, scale);
        // 括弧の時は深くする
        case '(':
            const lastClose = exp.lastIndexOf(')');
            if (lastClose === -1)
                // ')'がなければエラー
                throw new ParsingError(locale('too-much', '\'(\''));
            const sub = exp.slice(0, lastClose);
            exp = exp.slice(lastClose + 1);

            if (!exp[0]) return formulaAnalyzer(sub, opTable, funcs, scale);

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const toBeOp = exp.shift()!;
            const op = opTable[toBeOp];
            if (!op) throw new GenerateError(locale('error.not-exist', locale('operator'), toBeOp));

            return { front: formulaAnalyzer(sub, opTable, funcs, scale), op: op, back: formulaAnalyzer(exp, opTable, funcs, scale) };
        case ')':
            // '('がなければエラー
            throw new ParsingError(locale('too-much', '\')\''));
        default:
            if (!func.identifier.match(/^\S+\($/) || !func.destination)
                throw new GenerateError(locale('formula-to-score-operation.illegal-formula'));
    }

    const nested = exp.slice(0, exp.lastIndexOf(')'));
    exp = exp.slice(exp.lastIndexOf(')') + 1);

    const subArr: string[][] = [];
    const separation = { new: 0, old: 0 };
    let _str: string;

    // exp =    f( f( f( 1 , 2 ) , f( 3 , 4 ) ) , 5 )
    // nested = ['f('  'f('  '1'  ','  '2'  ')'  ','  'f('  '3'  ','  '4'  ')'  ')'  ','  '5']
    let i = 0;
    while (i < func.arity - 1) {
        separation.new = nested.indexOf(',', separation.old);
        _str = nested.slice(separation.old, separation.new).join(' ');
        subArr[i] = _str.split(' ');
        if (_str.split('(').length === _str.split(')').length
            && _str.lastIndexOf('(') <= _str.lastIndexOf(')'))
            i++;
        separation.old = separation.new + 1;
    }
    subArr.push(nested.slice(separation.new + 1));

    if (!func.destination)
        throw new ParsingError(locale('parsing-error', func.identifier));

    const nameElem = func.destination.namely.split(' ');
    if (func.identifier === 'if(') {
        funcs.push({ condition: conditionAssembling(subArr[0], true, opTable, funcs, scale), then: formulaAnalyzer(subArr[1], opTable, funcs, scale), else: formulaAnalyzer(subArr[2], opTable, funcs, scale) });
        nameElem[0] = `$MCDUtil_${nameElem[0]}_${funcs.length}`;
    }

    func.destination.args.forEach((e, j) => {
        for (let argIndex = nameElem.indexOf(e); argIndex !== -1; argIndex = nameElem.indexOf(e, argIndex + 1))
            nameElem[argIndex] = formulaToString(formulaAnalyzer(subArr[j], opTable, funcs, scale));
    });
    const _exp = ['(', ...nameElem, ')'];

    if (!exp[0])
        return formulaAnalyzer(_exp, opTable, funcs, scale);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const toBeOp = exp.shift()!;
    const op = opTable[toBeOp];
    if (!op) throw new GenerateError(locale('error.not-exist', locale('operator'), toBeOp));

    return { front: formulaAnalyzer(_exp, opTable, funcs, scale), op, back: formulaAnalyzer(exp, opTable, funcs, scale) };
}

function formulaToString(formula: Formula | string): string {
    if (typeof formula === 'string')
        return formula;
    return `${formulaToString(formula.front)} ${formula.op.identifier} ${formulaToString(formula.back)}`;
}

function conditionAssembling(exp: string[], isTrue: boolean, opTable: OperateTable, funcs: IfFormula[], scale: number): ConditionExp[] {
    if (exp.includes('&&')) {
        const index = exp.indexOf('&&');
        return [...conditionAssembling(exp.slice(0, index), isTrue, opTable, funcs, scale), ...conditionAssembling(exp.slice(index + 1), isTrue, opTable, funcs, scale)];
    }
    if (exp.includes('||')) {
        const index = exp.indexOf('||');
        return [...conditionAssembling(exp.slice(0, index), !isTrue, opTable, funcs, scale), ...conditionAssembling(exp.slice(index + 1), !isTrue, opTable, funcs, scale)];
    }
    let spliter = 0;
    for (let i = 0; i < exp.length; i++) {
        if (conditionExpTable[exp[i]])
            spliter = i;
    }
    return [{ front: formulaAnalyzer(exp.slice(0, spliter), opTable, funcs, scale), op: conditionExpTable[exp[spliter]], back: formulaAnalyzer(exp.slice(spliter + 1), opTable, funcs, scale), default: (exp[1] === '!=') ? !isTrue : isTrue }];
}