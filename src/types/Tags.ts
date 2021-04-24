export interface Tags {
    values: (string | {
        id: string
        required: boolean
    })[]
}