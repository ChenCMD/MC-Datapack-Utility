import { ElementBase } from './TableBase';

export interface IfOperator extends ElementBase {
    identifier: '&&' | '||' | '<' | '<=' | '==' | '>=' | '>'
}

export const ifOperators: IfOperator[] = [
    {
        identifier: '&&',
        type: 'op'
    },
    {
        identifier: '||',
        type: 'op'
    },
    {
        identifier: '<',
        type: 'op'
    },
    {
        identifier: '<=',
        type: 'op'
    },
    {
        identifier: '==',
        type: 'op'
    },
    {
        identifier: '>=',
        type: 'op'
    },
    {
        identifier: '>',
        type: 'op'
    }
];