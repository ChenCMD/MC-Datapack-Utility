import { TableBase, ElementBase } from './TableBase';

export type ScoreTable = TableBase<ScoreElement>;

export interface ScoreElement extends ElementBase {
    identifier: '*' | '/' | '%' | '+' | '-' | '='
    axiom: Axiom[]
}

interface Axiom {
    former?: boolean
    op: '*=' | '/=' | '%=' | '+=' | '-=' | '='
    latter?: boolean
}

export const scoreTable: ScoreTable = {
    table: [
        {
            identifier: '*',
            type: 'op',
            axiom: [
                {
                    op: '*='
                }
            ]
        },
        {
            identifier: '/',
            type: 'op',
            axiom: [
                {
                    op: '/='
                }
            ]
        },
        {
            identifier: '%',
            type: 'op',
            axiom: [
                {
                    op: '%='
                }
            ]
        },
        {
            identifier: '+',
            type: 'op',
            axiom: [
                {
                    op: '+='
                }
            ]
        },
        {
            identifier: '-',
            type: 'op',
            axiom: [
                {
                    op: '-='
                }
            ]
        },
        {
            identifier: '=',
            type: 'op',
            axiom: [
                {
                    former: true,
                    op: '=',
                    latter: true
                }
            ]
        }
    ],
    identifiers: ['*', '/', '%', '+', '-', '=']
};