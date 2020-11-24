export interface FileData {
    rel: string
    content?: string[],
    jsonAppend?: AppendElement
}

export interface AppendElement {
    key: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    elem: any
}