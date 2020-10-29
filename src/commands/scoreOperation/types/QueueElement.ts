export interface QueueElement {
    value: string
    objective: string
    type: 'op' | 'state' | 'num' | 'str' | 'fn'
}