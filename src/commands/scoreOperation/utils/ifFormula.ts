import { identifierToOpElem, ssft } from '.';
import { config } from '../../../extension';
import { locale } from '../../../locales';
import { GenerateError, ParsingError } from '../../../types/Error';
import { IfFormula, IfFormulaChain } from '../types/Formula';
import { OperateElement, OperateTable } from '../types/OperateTable';

export function ifFormulaAnalyzer(exp: string[], opTable: OperateTable): string | IfFormula {
    const first = exp.shift();
    if (!first)
        throw new GenerateError(locale('formula-to-score-operation.illegal-formula'));

    const func = identifierToOpElem(first, opTable);

    if (!func) {
        const scale = config.scoreOperation.valueScale;
        const front = (scale === 1) ? first : { condition: 'true', trues: { front: first, op: opTable.table[ssft('*', opTable)], back: scale.toString() } };

        const op = identifierToOpElem(exp.shift(), opTable);
        // 数値か文字の値
        if (!op) return front;
        const back = ifFormulaAnalyzer(exp, opTable);

        if (typeof back === 'string' || typeof back.trues === 'string' || typeof back.falses === 'string')
            return conditionedIfFormula('true', { front, op, back });

        if (op.identifier === '=') {
            const backTrues = (typeof back.trues === 'string') ? back.trues : back.trues.front;
            if (back.falses)
                return conditionedIfFormula(back, { front, op, back: backTrues }, { front, op, back: (typeof back.falses === 'string') ? back.falses : back.falses.front });
            return conditionedIfFormula(back, { front, op, back: backTrues });
        }

        if (!back.falses)
            return conditionedIfFormula('true', { front: conditionedIfFormula(back, { front, op, back: back.trues.front }), op: back.trues.op, back: back.trues.back });

        // 右優先なのか左優先なのか × back.condition が真/偽である => 2×2
        if (!(back.trues.op.order < op.order || (back.trues.op.order === op.order && op.assocLow === 'R'))
            && !(back.falses.op.order < op.order || (back.falses.op.order === op.order && op.assocLow === 'R'))) {
            return conditionedIfFormula(back,
                { front, op, back: conditionedIfFormula('true', { front: back.trues.front, op: back.trues.op, back: back.trues.back }) },
                { front, op, back: conditionedIfFormula('true', { front: back.falses.front, op: back.falses.op, back: back.falses.back }) });
        }
        if (!(back.trues.op.order < op.order || (back.trues.op.order === op.order && op.assocLow === 'R'))
            && (back.falses.op.order < op.order || (back.falses.op.order === op.order && op.assocLow === 'R'))) {
            return conditionedIfFormula(back,
                { front, op, back: conditionedIfFormula('true', { front: back.trues.front, op: back.trues.op, back: back.trues.back }) },
                { front: conditionedIfFormula('true', { front, op, back: back.falses.front }), op: back.falses.op, back: back.falses.back });
        }
        if ((back.trues.op.order < op.order || (back.trues.op.order === op.order && op.assocLow === 'R'))
            && !(back.falses.op.order < op.order || (back.falses.op.order === op.order && op.assocLow === 'R'))) {
            return conditionedIfFormula(back,
                { front: conditionedIfFormula('true', { front, op, back: back.trues.front }), op: back.trues.op, back: back.trues.back },
                { front, op, back: conditionedIfFormula('true', { front: back.falses.front, op: back.falses.op, back: back.falses.back }) });
        }
        if ((back.trues.op.order < op.order || (back.trues.op.order === op.order && op.assocLow === 'R'))
            && (back.falses.op.order < op.order || (back.falses.op.order === op.order && op.assocLow === 'R'))) {
            return conditionedIfFormula(back,
                { front: conditionedIfFormula('true', { front, op, back: back.trues.front }), op: back.trues.op, back: back.trues.back },
                { front: conditionedIfFormula('true', { front, op, back: back.falses.front }), op: back.falses.op, back: back.falses.back });
        }

        throw new Error();
    }

    switch (func.identifier) {
        // 単項演算子の場合
        case '+': {
            const op = identifierToOpElem('#', opTable);
            if (!op) throw new Error();
            return conditionedIfFormula('true', { front: '', op, back: ifFormulaAnalyzer(exp, opTable) });
        }
        case '-': {
            const op = identifierToOpElem('_', opTable);
            if (!op) throw new Error();
            return conditionedIfFormula('true', { front: '', op, back: ifFormulaAnalyzer(exp, opTable) });
        }
        // 括弧の場合
        case '(':
            const lastClose = exp.lastIndexOf(')');
            if (lastClose === -1)
                // ')'がなければエラー
                throw new ParsingError(locale('too-much', '\'(\''));
            const sub = exp.slice(0, lastClose);
            exp = exp.slice(lastClose + 1);

            const op = identifierToOpElem(exp.shift(), opTable);
            if (!op) return ifFormulaAnalyzer(sub, opTable);
            return conditionedIfFormula('true', { front: ifFormulaAnalyzer(sub, opTable), op, back: ifFormulaAnalyzer(exp, opTable) });
        case ')':
            // '('がなければエラー
            throw new ParsingError(locale('too-much', '\')\''));
        // 値でも括弧でもない1要素目は関数と考える
        default:
            if (!func.identifier.match(/^\S+\($/))
                throw new GenerateError(locale('formula-to-score-operation.illegal-formula'));
    }

    // 関数なのに置換先がない
    if (!func.destination)
        throw new ParsingError(locale('parsing-error', func.identifier));

    const nested = exp.slice(0, exp.lastIndexOf(')'));
    exp = exp.slice(exp.lastIndexOf(')') + 1);

    const subArr: string[][] = [];
    let separation = 0;
    let _str: string;

    // TODO もしかすると2つより多くの引数を取る場合は想定されていないかも
    let i = 0;
    while (i < func.arity - 1) {
        // 最適な区切りの位置を探す
        separation = nested.indexOf(',', separation + 1);
        _str = nested.slice(0, separation).join(' ');
        subArr[i] = _str.split(' ');
        if (_str.split('(').length === _str.split(')').length
            && _str.lastIndexOf('(') <= _str.lastIndexOf(')'))
            i++;
    }
    subArr.push(nested.slice(separation + 1));

    let op : OperateElement | undefined;
    switch (func.identifier) {
        case 'if(':
            // if( ( c ) ? ( f ) : ( g ) )
            const statement = exp.slice(0, exp.lastIndexOf(')'));
            exp = exp.slice(exp.lastIndexOf(')') + 1);
            const question = statement.indexOf('?');
            const colon = statement.indexOf(':');

            const condition = statement.slice(1, question - 1).join(' ');
            const trues = ifFormulaAnalyzer(statement.slice(question + 1, colon), opTable);
            const falses = ifFormulaAnalyzer(statement.slice(colon + 1, statement.length), opTable);

            op = identifierToOpElem(exp.shift(), opTable);
            if (!op)
                return ifFormulaAnalyzer([], opTable);
            return conditionedIfFormula(condition,
                { front: trues, op, back: ifFormulaAnalyzer(exp, opTable) },
                { front: falses, op, back: ifFormulaAnalyzer(exp, opTable) });

        default:
            const nameElem = func.destination.namely.split(' ');
            func.destination.args.forEach((e, j) => {
                for (let argIndex = nameElem.indexOf(e); argIndex !== -1; argIndex = nameElem.indexOf(e, argIndex + 1))
                    nameElem[argIndex] = ifFormulaToString(ifFormulaAnalyzer(subArr[j], opTable));
            });

            const _exp = `( ${nameElem.join(' ')} )`.split(' ');

            op = identifierToOpElem(exp.shift(), opTable);
            if (!op)
                return ifFormulaAnalyzer(_exp, opTable);
            return conditionedIfFormula('true', { front: ifFormulaAnalyzer(_exp, opTable), op, back: ifFormulaAnalyzer(exp, opTable) });
    }
}
function conditionedIfFormula(_condition: string | IfFormula, trues: string | IfFormulaChain, falses?: string | IfFormulaChain): IfFormula {
    const condition = (typeof _condition === 'string') ? _condition : _condition.condition;
    if (condition === 'true')
        return { condition, trues };
    if (!falses)
        throw new Error();
    return { condition, trues, falses };
}

function ifFormulaToString(formula: IfFormula | string): string {
    if (typeof formula === 'string')
        return formula;

    const strTrue = (typeof formula.trues === 'string') ? ifFormulaToString(formula.trues) : ifFormulaToString(formula.trues.front);
    if (formula.condition === 'true')
        return `if ( true ) ( ${strTrue} )`;

    let strFalse: string;
    if (typeof formula.falses === 'string') {
        strFalse = ifFormulaToString(formula.falses);
    } else {
        if (formula.falses)
            strFalse = ifFormulaToString(formula.falses.front);
        else
            throw new Error();
    }
    return `if ( ${formula.condition} ) ( ${strTrue} ) : ( ${strFalse} )`;
}