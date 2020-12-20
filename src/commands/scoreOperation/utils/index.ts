import { Deque } from '../../../types/Deque';
import { QueueElement } from '../types/QueueElement';
import { TableBase } from '../types/TableBase';
import { listenInput } from '../../../utils/vscodeWrapper';
import { locale } from '../../../locales';
import { Formula } from '../types/Formula';
import { OperateElement, OperateTable } from '../types/OperateTable';

/**
 * Search String From Table
 * @param {string} _str -**_table**内からこのパラメータを探す
 * @param {Tablebase} _table このテーブル内から**_str**を探す
 */
export function ssft(_str: string | undefined, _table: TableBase): number {
    if (!_str) return -1;
    return _table.identifiers.indexOf(_str);
}

export async function formulaToQueue(value: Formula | string, queue: Deque<QueueElement>, opTable: TableBase, _objective: string, prefix: string, isAlwaysSpecifyObject: boolean): Promise<boolean> {
    if (typeof value !== 'string') {
        const res1 = await formulaToQueue(value.front, queue, opTable, _objective, prefix, isAlwaysSpecifyObject);
        const res2 = await formulaToQueue(value.back, queue, opTable, _objective, prefix, isAlwaysSpecifyObject);
        if (!res1 || !res2) return false;
        queue.addLast({ value: value.op.identifier, objective: '', type: value.op.type });
        return true;
    }
    let objective = _objective;
    if (Number.prototype.isValue(value)) {
        queue.addLast({ value, objective, type: 'num' });
    } else {
        if (isAlwaysSpecifyObject && !value.startsWith(prefix)) {
            const str = await listenInput(locale('formula-to-score-operation.specifying-object', value));
            if (str === undefined) return false;
            objective = str ?? objective;
        }
        queue.addLast({ value, objective, type: 'str' });
    }
    return true;
}

export function identifierToOperate(identifier: string, opTable: OperateTable): OperateElement {
    return opTable.table.filter(e => e.identifier === identifier)[0];
}