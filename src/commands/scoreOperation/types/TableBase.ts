export interface ITableBase {
    table: IElementBase[]
    identifiers: string[]
}

export interface IElementBase {
    identifier: string
    type: 'op' | 'state'
}