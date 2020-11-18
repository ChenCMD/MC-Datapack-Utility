import { Deque } from '../../../types/Deque';
import { QueueElement } from '../types/QueueElement';
import { TableBase } from '../types/TableBase';
import { showInputBox } from '../../../utils/common';
import { locale } from '../../../locales';
import { Formula } from '../types/Formula';

/**
 * Search String From Table
 * @param {string} _str -**_table**内からこのパラメータを探す
 * @param {Tablebase} _table このテーブル内から**_str**を探す
 */
export function ssft(_str: string | undefined, _table: TableBase): number {
    if (!_str) return -1;
    return _table.identifiers.indexOf(_str);
}

export async function formulaToQueue(value: Formula | string, queue: Deque<QueueElement>, opTable: TableBase, objective: string, isAlwaysSpecifyObject: boolean): Promise<boolean> {
    if (typeof value !== 'string') {
        const res1 = await formulaToQueue(value.front, queue, opTable, objective, isAlwaysSpecifyObject);
        const res2 = await formulaToQueue(value.back, queue, opTable, objective, isAlwaysSpecifyObject);
        if (!res1 || !res2) return false;
        queue.addLast({ value: value.op.identifier, objective: '', type: value.op.type });
        return true;
    }
    if (Number.prototype.isValue(value)) {
        queue.addLast({ value, objective: objective, type: 'num' });
    } else {
        let _objective = objective;
        if (isAlwaysSpecifyObject) {
            const str = await showInputBox(locale('formula-to-score-operation.specifying-object', value));
            if (str === undefined) return false;
            _objective = str ?? objective;
        }
        queue.addLast({ value, objective: _objective, type: 'str' });
    }
    return true;
}