export interface QueueElement {
    value: string
    type: 'op' | 'state' | 'num' | 'str' | 'fn'
}