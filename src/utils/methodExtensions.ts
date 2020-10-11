export { }
// 拡張メソッドの定義
declare global {
    interface Array<T> {
        flat<U>(func: (x: T) => Array<U>): Array<U>
    }
    interface Number {
        isValue(testVar: any): boolean
    }
}

Array.prototype.flat = function <T, U>(func: (x: T) => Array<U>): Array<U> {
    return (<Array<U>>[]).concat(...(this as T[]).map(v => func(v)))
}

Number.prototype.isValue = function (testVar) {
    return (!isNaN(Number(testVar)))
}