import { Formula } from './Formula'
import { ElementBase, TableBase } from './TableBase'

export interface ConditionExp {
    front: string | Formula
    op: ConditionExpElement
    back: string | Formula
    default: boolean
}

export interface ConditionExpElement extends ElementBase {
    type: 'op' | 'state'
    replaceTo: string
}

export type ConditionExpTable = TableBase<ConditionExpElement>

export const conditionExpTable: ConditionExpTable = {
    '<': {
        identifier: '<',
        type: 'op',
        replaceTo: '<'
    },
    '<=': {
        identifier: '<=',
        type: 'op',
        replaceTo: '<='
    },
    '==': {
        identifier: '==',
        type: 'op',
        replaceTo: '='
    },
    '!=': {
        identifier: '!=',
        type: 'op',
        replaceTo: '='
    },
    '>=': {
        identifier: '>=',
        type: 'op',
        replaceTo: '>='
    },
    '>': {
        identifier: '>',
        type: 'op',
        replaceTo: '>'
    },
    '&&': {
        identifier: '&&',
        type: 'state',
        replaceTo: ''
    },
    '||': {
        identifier: '||',
        type: 'state',
        replaceTo: ''
    }
}