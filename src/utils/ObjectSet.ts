export class ObjectSet<T> extends Set<T> {
    add(value: T): this {
        if ([...this].some(item => JSON.stringify(value) === JSON.stringify(item)))
            super.add(value);
        return this;
    }
}