import { Deque } from '../../../types/Deque';
import { QueueElement } from '../types/QueueElement';
import { TableBase } from '../types/TableBase';
import { listenInput } from '../../../utils/vscodeWrapper';
import { locale } from '../../../locales';
import { Formula, IfFormula } from '../types/Formula';
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

/** 
 * @param {string} _identifier 探す演算識別子
 * @param {OperateTable} opTable このテーブルから**_identifier**を探す
*/
export function identifierToOpElem(_identifier: string | undefined, opTable: OperateTable): OperateElement | undefined {
    const responces = opTable.table.filter(e => (e.identifier === _identifier));
    if (responces.length === 0) return undefined;
    return responces[0];
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
            const str = await listenInput(locale('formula-to-score-operation.specifying-object', value));
            if (str === undefined) return false;
            _objective = str ?? objective;
        }
        queue.addLast({ value, objective: _objective, type: 'str' });
    }
    return true;
}

export async function ifFormulaToQueue(value: IfFormula | string, queue: Deque<QueueElement>, objective: string, isAlwaysSpecifyObject: boolean): Promise<boolean> {
    if (typeof value === 'string') {
        if (Number.prototype.isValue(value)) {
            queue.addLast({ value, objective: objective, type: 'num' });
        } else {
            let _objective = objective;
            if (isAlwaysSpecifyObject) {
                const str = await listenInput(locale('formula-to-score-operation.specifying-object', value));
                if (str === undefined) return false;
                _objective = str ?? objective;
            }
            queue.addLast({ value, objective: _objective, type: 'str' });
        }
    }
    
    return true;
}