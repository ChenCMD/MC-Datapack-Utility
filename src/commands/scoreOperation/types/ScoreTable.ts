import { TableBase, ElementBase } from './TableBase';

export interface ScoreTable extends TableBase {
    table: ScoreElement[]
}

export interface ScoreElement extends ElementBase {
    identifier: '*' | '/' | '%' | '+' | '-' | '='
    axiom: Array<Axiom>
}

interface Axiom {
    former: boolean
    op: '*=' | '/=' | '%=' | '+=' | '-=' | '='
    latter: boolean
}

export const scoreTable: ScoreTable = {
    table: [
        {
            identifier: '*',
            type: 'op',
            axiom: [
                {
                    former: false,
                    op: '*=',
                    latter: false
                }
            ]
        },
        {
            identifier: '/',
            type: 'op',
            axiom: [
                {
                    former: false,
                    op: '/=',
                    latter: false
                }
            ]
        },
        {
            identifier: '%',
            type: 'op',
            axiom: [
                {
                    former: false,
                    op: '%=',
                    latter: false
                }
            ]
        },
        {
            identifier: '+',
            type: 'op',
            axiom: [
                {
                    former: false,
                    op: '+=',
                    latter: false
                }
            ]
        },
        {
            identifier: '-',
            type: 'op',
            axiom: [
                {
                    former: false,
                    op: '-=',
                    latter: false
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