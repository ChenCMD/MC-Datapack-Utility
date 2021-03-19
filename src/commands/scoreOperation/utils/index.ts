import { Deque } from '../../../types/Deque';
import { QueueElement } from '../types/QueueElement';
import { listenInput } from '../../../utils/vscodeWrapper';
import { locale } from '../../../locales';
import { Formula } from '../types/Formula';
import { ScoreOperationConfig } from '../../../types/Config';

export async function formulaToQueue(value: Formula | string, queue: Deque<QueueElement>, config: ScoreOperationConfig, enteredValues: Set<string>): Promise<boolean> {
    if (typeof value !== 'string') {
        const res1 = await formulaToQueue(value.front, queue, config, enteredValues);
        const res2 = await formulaToQueue(value.back, queue, config, enteredValues);
        if (!res1 || !res2) return false;
        queue.addLast({ value: value.op.identifier, objective: '', type: value.op.type });
        return true;
    }
    let objective = config.objective;
    if (Number.prototype.isValue(value)) {
        queue.addLast({ value, objective, type: 'num' });
    } else {
        if (config.isAlwaysSpecifyObject && !value.startsWith(config.prefix) && !enteredValues.has(value)) {
            const str = await listenInput(locale('formula-to-score-operation.specifying-object', value));
            if (str === undefined) return false;
            objective = str ?? objective;
        }
        queue.addLast({ value, objective, type: 'str' });
    }
    enteredValues.add(value);
    return true;
}