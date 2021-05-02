import { JsonObject, JsonValue } from './JsonObject';

export interface FileDataReqContent extends FileData {
    content: ContentType
}

export interface FileData {
    rel: string
    content?: ContentType
    append?: AppendElement
}

export type ContentType = string[] | JsonObject | JsonObject[];

export interface AppendElement {
    key: string
    elem: JsonValue
}