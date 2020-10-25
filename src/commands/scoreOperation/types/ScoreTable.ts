import { TableBase, ElementBase } from './TableBase';

export interface ScoreTable extends TableBase {
    table: ScoreElement[]
}

export interface ScoreElement extends ElementBase {
    identifier: '*' | '/' | '%' | '+' | '-' | '='
    axiom: string
}

export const scoreTable: ScoreTable = {
    table: [
        {
            identifier: '*',
            type: 'op',
            axiom: '*='
        },
        {
            identifier: '/',
            type: 'op',
            axiom: '/='
        },
        {
            identifier: '%',
            type: 'op',
            axiom: '%='
        },
        {
            identifier: '+',
            type: 'op',
            axiom: '+='
        },
        {
            identifier: '-',
            type: 'op',
            axiom: '-='
        },
        {
            identifier: '=',
            type: 'op',
            axiom: '='
        }
    ],
    identifiers: ['*', '/', '%', '+', '-', '=']
};