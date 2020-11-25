/* eslint-disable @typescript-eslint/no-explicit-any */

import { isStringArray } from '../utils/typeGuards';

const contexts = [
    'dir',
    'datapackRoot',
    'datapackName',
    'datapackDescription',
    'namespace',
    'fileResourcePath',
    'fileName',
    'fileType',
    'fileExtname',
    'nowOpenFileType',
    'nowOpenFileResourcePath',
    'nowOpenFileName',
    'nowOpenFileExtname',
    'date',
    'cursor'
] as const;

type Context = typeof contexts[number];

export type ContextContainer = {
    [key in Context]?: string
};

export function resolveVars(obj: string, ctxContainer: ContextContainer): string;
export function resolveVars(obj: string[], ctxContainer: ContextContainer): string[];
export function resolveVars(obj: { [key: string]: any }, ctxContainer: ContextContainer): { [key: string]: any };
export function resolveVars(obj: { [key: string]: any }[], ctxContainer: ContextContainer): { [key: string]: any }[];
export function resolveVars(obj: string | string[] | { [key: string]: any } | { [key: string]: any }[], ctxContainer: ContextContainer): string;
export function resolveVars(obj: string | string[] | { [key: string]: any } | { [key: string]: any }[], ctxContainer: ContextContainer): string[];
export function resolveVars(obj: string | string[] | { [key: string]: any } | { [key: string]: any }[], ctxContainer: ContextContainer): { [key: string]: any };
export function resolveVars(obj: string | string[] | { [key: string]: any } | { [key: string]: any }[], ctxContainer: ContextContainer): { [key: string]: any }[];
export function resolveVars(obj: string | string[] | { [key: string]: any } | { [key: string]: any }[], ctxContainer: ContextContainer): any {
    const resolve = (str: string) => str.replace(/%.+?%/g, match => {
        const key = match.slice(1, -1);
        for (const safeKey of contexts) if (key === safeKey) return ctxContainer[key] ?? '';
        return match;
    });
    const walkObj = (_obj: { [key: string]: any }): any => {
        const process = (elem: any): any => {
            if (Array.isArray(elem)) return elem.map(v => process(v));
            if (typeof elem === 'object') return walkObj(elem);
            if (typeof elem === 'string') return resolve(elem);
            return elem;
        };
        for (const key of Object.keys(_obj)) _obj[key] = process(_obj[key]);
        return _obj;
    };

    if (Array.isArray(obj)) {
        if (isStringArray(obj))
            return obj.map(resolve); // String[]
        else
            return obj.map(walkObj); // { [key: string]: any }[]
    } else {
        if (typeof obj === 'string')
            return resolve(obj); // string
        else
            return walkObj(obj); // { [key: string]: any }
    }
}