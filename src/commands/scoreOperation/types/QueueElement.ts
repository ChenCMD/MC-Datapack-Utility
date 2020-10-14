export interface IQueueElement {
    value: string
    type: 'op' | 'state' | 'num' | 'str' | 'fn'
}