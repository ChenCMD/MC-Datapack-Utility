import { Deque } from '../../../types/Deque';
import { QueueElement } from '../types/QueueElement';
import { TableBase } from '../types/TableBase';
import { showInputBox } from '../../../utils/common';
import { locale } from '../../../locales';
import { workspace } from 'vscode';
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

export async function formulaToQueue(_val: Formula | string, _stack: Deque<QueueElement>, _opTable: TableBase, _objective: string): Promise<Deque<QueueElement>> {
    if (typeof _val === 'string') {
        if (Number.prototype.isValue(_val)) {
            _stack.addLast({ value: _val, objective: _objective, type: 'num' });
        } else {
            let obj = _objective;
            if (workspace.getConfiguration('mcdutil').get<boolean>('scoreOperation.isAlwaysSpecifyObject', true))
                obj = await showInputBox(locale('formula-to-score-operation.specifying-object', _val)) ?? _objective;
    
            _stack.addLast({ value: _val, objective: obj, type: 'str' });
        }
        return _stack;
    }

    if (typeof _val.front === 'string') {
        if (Number.prototype.isValue(_val.front)) {
            _stack.addLast({ value: _val.front, objective: _objective, type: 'num' });
        } else {
            let obj = _objective;
            if (workspace.getConfiguration('mcdutil').get<boolean>('scoreOperation.isAlwaysSpecifyObject', true))
                obj = await showInputBox(locale('formula-to-score-operation.specifying-object', _val.front)) ?? _objective;
    
            _stack.addLast({ value: _val.front, objective: obj, type: 'str' });
        }
    } else {
        _stack = await formulaToQueue(_val.front, _stack, _opTable, _objective);
    }

    if (typeof _val.back === 'string') {
        if (Number.prototype.isValue(_val.back)) {
            _stack.addLast({ value: _val.back, objective: _objective, type: 'num' });
        } else {
            let obj = _objective;
            if (workspace.getConfiguration('mcdutil').get<boolean>('scoreOperation.isAlwaysSpecifyObject', true))
                obj = await showInputBox(locale('formula-to-score-operation.specifying-object', _val.back)) ?? _objective;
    
            _stack.addLast({ value: _val.back, objective: obj, type: 'str' });
        }
    } else {
        _stack = await formulaToQueue(_val.back, _stack, _opTable, _objective);
    }

    _stack.addLast({ value: _val.op.identifier, objective: '', type: _val.op.type });
    return _stack;
}