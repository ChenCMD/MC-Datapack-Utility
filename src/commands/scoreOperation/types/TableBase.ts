export interface TableBase {
    table: ElementBase[]
    identifiers: string[]
}

export interface ElementBase {
    identifier: string
    type: 'op' | 'state'
}