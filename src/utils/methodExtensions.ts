export { };
// 拡張メソッドの定義
declare global {
    interface Array<T> {
        flat<U>(func: (x: T) => U[]): U[]
        flatPromise<U>(func: (x: T) => Promise<U[]>): Promise<U[]>
        clear(): void
    }
    interface Number {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isValue(testVar: any): boolean
        mod(n: number): number
    }
}

Array.prototype.flat = function <T, U>(func: (x: T) => U[]): U[] {
    return (<U[]>[]).concat(...(this as T[]).map(func));
};

Array.prototype.flatPromise = async function <T, U>(func: (x: T) => Promise<U[]>): Promise<U[]> {
    return (<U[]>[]).concat(...await Promise.all((this as T[]).map(async v => await func(v))));
};

Array.prototype.clear = function (): void {
    while (this.length > 0)
        this.pop();
};

Number.prototype.isValue = function (testVar) {
    return (!isNaN(Number(testVar)));
};

Number.prototype.mod = function (n) {
    return (((this as number) % n) + n) % n;
};