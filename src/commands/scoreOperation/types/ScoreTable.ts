import { ITableBase, IElementBase } from './TableBase';

export interface IScoreTable extends ITableBase {
    table: IScoreElement[]
}

export interface IScoreElement extends IElementBase {
    identifier: '*' | '/' | '%' | '+' | '-' | '='
    axiom: string
}

export const scoreTable: IScoreTable = {
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