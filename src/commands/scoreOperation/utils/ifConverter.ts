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
            if (typeof exp.trues !== 'string')
                resFormulas.push(`scoreboard players operation ${exp.trues.front} _ ${exp.trues.op.identifier} ${exp.trues.back} _`);
            else throw new Error();
        } else {
            if (typeof exp.trues !== 'string' && exp.falses && typeof exp.falses !== 'string') {
                resFormulas.push(`execute ${conditionStack.join(' ')} run scoreboard players operation ${exp.trues.front} _ ${exp.trues.op} ${exp.trues.back} _`);
                resFormulas.push(`execute ${conditionStack.join(' ')} run scoreboard players operation ${exp.falses.front} _ ${exp.falses.op} ${exp.falses.back} _`);
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