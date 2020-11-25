/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FileData {
    rel: string
    content?: ContentType
    append?: AppendElement
}

export interface FileDataReqContent extends FileData {
    content: ContentType
}

export type ContentType = string[] | { [key: string]: any } | { [key: string]: any }[];

export interface AppendElement {
    key: string
    elem: any
}