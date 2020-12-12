import { IfFormula } from '../types/Formula';

export function ifFormulaDisassembler(exp: IfFormula | string): { resValues: Set<string>, resFormulas: string[] } {
    const conditionStack: string[] = [];
    const resFormulas: string[] = [];
    const resValues = new Set<string>();

    if (typeof exp === 'string')
        return { resValues, resFormulas };

    {
        const condition = exp.condition.split('&&');
        if (condition[0] !== 'true') {
            condition.forEach(e => {
                const part = e.split(' ');
                conditionStack.push(`if score ${part[0]} _ ${part[1]} ${part[2]} _`);
                addValue(part[0], resValues);
                addValue(part[2], resValues);
            });
        }
        if (conditionStack.length === 0) {
            if (typeof exp.trues !== 'string') {
                if (typeof exp.trues.front === 'string')
                    addValue(exp.trues.front, resValues);
                if (typeof exp.trues.back === 'string')
                    addValue(exp.trues.back, resValues);
                resFormulas.push(`scoreboard players operation ${exp.trues.front} _ ${exp.trues.op.identifier} ${exp.trues.back} _`);
            } else {
                throw new Error();
            }
        } else {
            if (typeof exp.trues !== 'string' && exp.falses && typeof exp.falses !== 'string') {
                if (typeof exp.trues.front === 'string')
                    addValue(exp.trues.front, resValues);
                if (typeof exp.trues.back === 'string')
                    addValue(exp.trues.back, resValues);
                if (typeof exp.falses.front === 'string')
                    addValue(exp.falses.front, resValues);
                if (typeof exp.falses.back === 'string')
                    addValue(exp.falses.back, resValues);
                resFormulas.push(`execute ${conditionStack.join(' ')} run scoreboard players operation ${exp.trues.front} _ ${exp.trues.op.identifier} ${exp.trues.back} _`);
                conditionStack.push((conditionStack.pop() ?? '').replace('if', 'unless') ?? '');
                resFormulas.push(`execute ${conditionStack.join(' ')} run scoreboard players operation ${exp.falses.front} _ ${exp.falses.op.identifier} ${exp.falses.back} _`);
                conditionStack.pop();
            } else {
                throw new Error();
            }
        }
    }
    return { resValues, resFormulas };
}

function addValue(v: string, stack: Set<string>) {
    if (Number.prototype.isValue(v))
        stack.add(`scoreboard players set $MCDUtil_${v} _ ${v}`);
}