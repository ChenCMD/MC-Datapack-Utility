export { };
// 拡張メソッドの定義
declare global {
    interface Array<T> {
        flat<U>(func: (x: T) => U[]): U[]
        flatPromise<U>(func: (x: T) => Promise<U[]>): Promise<U[]>
        clear(): void
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