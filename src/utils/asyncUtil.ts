export async function asyncMap<T, U>(array: T[], callbackfn: (value: T, index: number, array: T[]) => Promise<U>): Promise<U[]> {
    return await Promise.all(array.map(callbackfn));
}

export async function asyncFilter<T>(array: T[], predicate: (value: T, index: number, array: T[]) => Promise<unknown>): Promise<T[]> {
    const res = await Promise.all(array.map(predicate));
    return array.filter((_, i) => res[i]);
}

export async function asyncSome<T>(array: T[], predicate: (value: T, index: number, array: T[]) => Promise<unknown>): Promise<boolean> {
    for (const [i, v] of array.entries()) if (await predicate(v, i, array)) return true;
    return false;
}

export async function asyncEvery<T>(array: T[], predicate: (value: T, index: number, array: T[]) => Promise<unknown>): Promise<boolean> {
    for (const [i, v] of array.entries()) if (!await predicate(v, i, array)) return false;
    return true;
}