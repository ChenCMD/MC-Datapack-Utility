import { isDeepStrictEqual } from 'util'

export class ObjectSet<T> extends Set<T> {
    add(value: T): this {
        if (![...this].some(item => isDeepStrictEqual(item, value)))
            super.add(value)
        return this
    }
}