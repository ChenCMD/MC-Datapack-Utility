import { ErrorTemplate } from "./interfaces";

export class Deque<E> implements IterableIterator<E> {
    private data: Array<E>;
    private front = 0;
    private tail = 0;
    private length = 0;

    private pointer = 0;

    constructor(private capacity = 10) {
        this.data = new Array<E>(capacity + 1);
    }

    [Symbol.iterator](): IterableIterator<E> {
        return this;
    }

    public next(): IteratorResult<E> {
        if (this.pointer < this.size()) {
            return {
                done: false,
                value: this.data[(this.front + this.pointer++).mod(this.capacity)]
            };
        } else {
            return {
                done: true,
                value: undefined
            };
        }
    }

    get(index: number): E {
        return this.data[(this.front + index).mod(this.capacity)];
    }

    pickout(index: number): E {
        const result = this.data[(this.front + index).mod(this.capacity)];
        this.reConstruct(index);
        return result;
    }

    map(func: (element: E, index: number, array: E[]) => E): void {
        const array: E[] = new Array(5);
        for (let i = 0; i < this.size(); i++) {
            array[i] = this.data[(this.front + i - 1).mod(this.capacity)];
        }
        for (let i = this.size(); i > 0; i--) {
            this.data[(this.front + i - 1).mod(this.capacity)] = func(this.data[(this.front + i - 1).mod(this.capacity)], i, array);
        }
    }

    add(...elements: E[]): void {
        this.addFirst(...elements);
    }

    addFirst(...elements: E[]): void {
        for (const element of elements) {
            if ((this.front - 1).mod(this.capacity) === this.tail) {
                this.reSize(this.getCapacity() * 2);
            }
            this.front = (this.front - 1).mod(this.capacity);
            this.data[this.front] = element;
            this.length++;
        }
    }

    addLast(...elements: E[]): void {
        for (const element of elements) {
            if ((this.tail + 1).mod(this.capacity) === this.front) {
                this.reSize(this.getCapacity() * 2);
            }
            this.data[this.tail] = element;
            this.tail = (this.tail + 1).mod(this.capacity);
            this.length++;
        }
    }

    contains(testElement: E): boolean {
        for (let i = 0; i < this.size(); i++) {
            if (this.data[(this.front + i).mod(this.capacity)] === testElement) {
                return true;
            }
        }
        return false;
    }

    descendingIterator(func: (element: E, index: number) => void): void {
        for (let i = this.size(); i > 0; i--) {
            func(this.data[(this.front + i - 1).mod(this.capacity)], i);
        }
    }

    element(): E {
        return this.getFirst();
    }

    getFirst(): E {
        if (this.size() === 0) {
            throw new NoSuchElementError();
        }
        return this.data[this.tail - 1];
    }

    getLast(): E {
        if (this.size() === 0) {
            throw new NoSuchElementError();
        }
        return this.data[this.front];
    }

    iterator(func: (element: E, index: number) => void): void {
        for (let i = 0; i < this.size(); i++) {
            func(this.data[(this.front + i).mod(this.capacity)], i);
        }
    }

    peek(): E | undefined {
        return this.peekFirst();
    }

    peekFirst(): E | undefined {
        if (this.size() === 0) {
            return undefined;
        }
        return this.data[this.front];
    }

    peekLast(): E | undefined {
        if (this.size() === 0) {
            return undefined;
        }
        return this.data[this.tail - 1];
    }

    poll(): E | undefined {
        return this.removeFirst();
    }

    pollFirst(): E | undefined {
        if (this.size() === 0) {
            return undefined;
        }

        const result = this.data[this.tail - 1];
        this.tail = (this.tail - 1).mod(this.capacity);
        this.length--;

        if (this.length === this.getCapacity() / 4 && this.getCapacity() / 2 !== 0) {
            this.reSize(this.getCapacity() / 2);
        }

        return result;
    }

    pollLast(): E | undefined {
        if (this.size() === 0) {
            return undefined;
        }

        const result: E = this.data[this.front];
        this.front = (this.front + 1).mod(this.capacity);
        this.length--;

        if (this.length === this.getCapacity() / 4 && this.getCapacity() / 2 !== 0) {
            this.reSize(this.getCapacity() / 2);
        }

        return result;
    }

    pop(): E {
        if (this.size() === 0) {
            throw new NoSuchElementError();
        }
        return this.removeFirst();
    }

    push(...element: E[]): void {
        this.addFirst(...element);
    }

    remove(): E;
    remove(removeElement: E): boolean;
    remove(removeElement?: E): boolean | E {
        return removeElement ? this.removeFirstOccurrence(removeElement) : this.removeFirst();
    }

    removeFirst(): E {
        if (this.size() === 0) {
            throw new NoSuchElementError();
        }

        const result: E = this.data[this.front];
        this.front = (this.front + 1).mod(this.capacity);
        this.length--;

        if (this.length === this.getCapacity() / 4 && this.getCapacity() / 2 !== 0) {
            this.reSize(this.getCapacity() / 2);
        }

        return result;
    }

    removeLast(): E {
        if (this.size() === 0) {
            throw new NoSuchElementError();
        }

        const result: E = this.data[this.tail - 1];
        this.tail = (this.tail - 1).mod(this.capacity);
        this.length--;

        if (this.length === this.getCapacity() / 4 && this.getCapacity() / 2 !== 0) {
            this.reSize(this.getCapacity() / 2);
        }

        return result;
    }

    removeFirstOccurrence(removeElement: E): boolean {
        for (let i = 0; i < this.size(); i++) {
            if (this.data[(this.front + i).mod(this.capacity)] === removeElement) {
                this.reConstruct(i);
                return true;
            }
        }

        if (this.length === this.getCapacity() / 4 && this.getCapacity() / 2 !== 0) {
            this.reSize(this.getCapacity() / 2);
        }
        return false;
    }

    removeLastOccurrence(removeElement: E): boolean {
        for (let i = this.size(); i > 0; i--) {
            if (this.data[(this.front + i - 1).mod(this.capacity)] === removeElement) {
                this.reConstruct(i - 1);
                return true;
            }
        }

        if (this.length === this.getCapacity() / 4 && this.getCapacity() / 2 !== 0) {
            this.reSize(this.getCapacity() / 2);
        }
        return false;
    }

    size(): number {
        return this.length;
    }

    clear(): void {
        this.front = 0;
        this.tail = 0;
        this.length = 0;
    }

    private reConstruct(withoutElementIndex: number): void {
        const newData = new Array<E>(this.capacity + 1);
        for (let i = 0; i < this.size(); i++) {
            if (i < withoutElementIndex) {
                newData[i] = (this.data[(this.front + i).mod(this.capacity)]);
            }
            if (i > withoutElementIndex) {
                newData[i - 1] = (this.data[(this.front + i).mod(this.capacity)]);
            }
        }
        this.length--;
        this.front = 0;
        this.tail = this.size() - 1;
        this.data = newData;
    }

    private reSize(newSize: number): void {
        console.log('reSize')
        const newData = new Array<E>(newSize + 1);
        for (let i = 0; i < this.size(); i++) {
            newData[i] = (this.data[(this.front + i).mod(this.capacity)]);
        }
        this.front = 0;
        this.tail = this.size();
        this.capacity = newSize;
        this.data = newData;
    }

    private getCapacity(): number {
        return this.capacity;
    }

    toString(): string {
        let str = '';
        for (let i = 0; i < this.size(); i++) {
            if (i !== 0) {
                str += ', ';
            }
            str += this.data[(this.front + i).mod(this.capacity)];
        }
        return str;
    }
}

export class NoSuchElementError extends ErrorTemplate {
    name = 'NoSuchElementError';
}