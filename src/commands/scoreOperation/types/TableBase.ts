export interface TableBase<E extends ElementBase> {
    table: E[]
    identifiers: string[]
}

export interface ElementBase {
    identifier: string
    type: 'op' | 'state'
}