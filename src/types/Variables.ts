/* eslint-disable @typescript-eslint/no-explicit-any */
import { isJsonObject, JsonObject, JsonValue } from './JsonObject';

export type Variables = { [key: string]: string };

export function resolveVars<T extends string | string[] | JsonValue>(obj: T, vars: Variables):
    T extends string ? string
    : T extends string[] ? string[]
    : T extends JsonValue ? JsonValue
    : T {
    const resolve = (str: string) => str.replace(/%.+?%/g, match => {
        const key = match.slice(1, -1);
        return Object.keys(vars).includes(key) ? vars[key] : match;
    });
    const walkObj = (_obj: JsonObject): JsonObject => {
        const process = (elem: JsonValue): JsonValue => {
            if (Array.isArray(elem)) return elem.map(v => process(v)); // JsonValue[]
            if (typeof elem === 'object') return walkObj(elem as JsonObject); // JsonObject
            if (typeof elem === 'string') return resolve(elem); // string
            return elem;
        };
        for (const key of Object.keys(_obj)) _obj[key] = process(_obj[key]);
        return _obj;
    };

    if (Array.isArray(obj)) return (obj as JsonValue[]).map(v => resolveVars(v, vars)) as any; // JsonValue[]

    if (typeof obj === 'string') return resolve(obj) as any; // string
    if (isJsonObject(obj)) return walkObj(obj) as any; // JsonObject

    return obj as any; // number | boolean | null

}