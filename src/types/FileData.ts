import { JsonObject, JsonValue } from './JSONObject';

export interface FileData {
    rel: string
    content?: ContentType
    append?: AppendElement
}

export interface FileDataReqContent extends FileData {
    content: ContentType
}

export type ContentType = string[] | JsonObject | JsonObject[];

export interface AppendElement {
    key: string
    elem: JsonValue
}