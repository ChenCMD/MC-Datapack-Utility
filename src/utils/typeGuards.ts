/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any*/

type Types = 'string' | 'number' | 'bigint' | 'boolean' | 'symbol' | 'undefined' | 'object' | 'function'

export function isNumber(obj: any): obj is number {
    return !isNaN(Number(obj))
}

const isSomethingArray = (obj: any, type: Types): boolean => Array.isArray(obj) && obj.every(v => typeof v === type)

export function isBigintArray(obj: any): obj is boolean[] {
    return isSomethingArray(obj, 'bigint')
}

export function isBooleanArray(obj: any): obj is boolean[] {
    return isSomethingArray(obj, 'boolean')
}

export function isFunctionArray(obj: any): obj is boolean[] {
    return isSomethingArray(obj, 'function')
}

export function isNumberArray(obj: any): obj is number[] {
    return isSomethingArray(obj, 'number')
}

export function isObjectArray(obj: any): obj is { [key: string]: any }[] {
    return isSomethingArray(obj, 'object') && obj !== null
}

export function isStringArray(obj: any): obj is string[] {
    return isSomethingArray(obj, 'string')
}

export function isSymbolArray(obj: any): obj is symbol[] {
    return isSomethingArray(obj, 'symbol')
}

export function isUndefinedArray(obj: any): obj is undefined[] {
    return isSomethingArray(obj, 'undefined')
}