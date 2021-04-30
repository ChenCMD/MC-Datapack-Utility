/**
 * @license
 * MIT License
 *
 * Copyright (c) 2019-2020 SPGoding
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


import { Position, TextDocument } from 'vscode';
import { locale } from '../locales';
import { ParsingError } from '../types/Error';
import { IndexMapping } from '../types/IndexMapping';

export class StringReader {
    constructor(
        public string: string,
        public cursor: number = 0,
        public end: number = string.length
    ) { }

    get passedString(): string {
        return this.string.slice(0, this.cursor);
    }

    get remainingString(): string {
        return this.string.slice(this.cursor, this.end);
    }

    clone(): StringReader {
        const ans = new StringReader(this.string, this.cursor, this.end);
        return ans;
    }

    canRead(length = 1): boolean {
        return this.cursor + length <= this.end;
    }

    /**
     * Peeks a character at the current cursor.
     * @param offset The index to offset from cursor. @default 0
     */
    peek(offset = 0): string {
        return this.string.charAt(this.cursor + offset);
    }

    /**
     * Skips the current character.
     * @param step The step to skip. @default 1
     */
    skip(step = 1): this {
        this.cursor += step;
        return this;
    }

    read(): string {
        return this.string.charAt(this.cursor++);
    }

    skipSpace(): this {
        while (this.canRead() && StringReader.isSpace(this.peek())) this.skip();
        return this;
    }

    skipWhiteSpace(): this {
        while (this.canRead() && StringReader.isWhiteSpace(this.peek())) this.skip();
        return this;
    }

    /**
     * @throws {ParsingError} When the value is NaN or have non-number char at the beginning.
     */
    readNumber(): string {
        let str = '';
        while (this.canRead() && StringReader.canInNumber(this.peek())) {
            if (this.peek() === '.' && this.peek(1) === '.') break;
            str += this.read();
        }
        if (str) {
            const num = Number(str);
            if (isNaN(num)) throw new ParsingError(locale('error.expected-got', locale('number'), locale('punc.quote', str)));
            return str;
        } else {
            const value = this.peek();
            if (value) throw new ParsingError(locale('error.expected-got', locale('number'), locale('punc.quote', this.peek())));
            throw new ParsingError(locale('error.expected-got', locale('number'), locale('nothing')));
        }
    }

    /**
     * @throws {ParsingError} When the value is float or exceeds the range.
     */
    readInt(): number {
        const str = this.readNumber();
        const num = parseInt(str);
        // num is float.
        if (str.includes('.')) throw new ParsingError(locale('error.expected-got', locale('integer'), str));

        return num;
    }

    /**
     * @param out Stores a mapping from in-string indices to real indices.
     */
    readUnquotedString(out: { mapping: IndexMapping } = { mapping: {} }): string {
        let ans = '';
        out.mapping.start = this.cursor;
        while (this.canRead() && StringReader.canInUnquotedString(this.peek())) ans += this.read();
        return ans;
    }

    /**
     * @throws {ParsingError} If it's not an legal quoted string.
     * @param out Stores a mapping from in-string indices to real indices.
     * @param isReadingJson Whether to read the whole JSON string, including quotes and escaping characters.
     */
    readQuotedString(out: { mapping: IndexMapping } = { mapping: {} }, looseEscapeCheck = false): string {
        let ans = '';
        if (!this.canRead()) {
            out.mapping.start = this.cursor;
            return '';
        }
        const quote = this.peek();
        if (StringReader.isQuote(quote)) {
            this.skip();
            ans += this.readUntilQuote(quote, out, looseEscapeCheck);
        } else {
            throw new ParsingError(locale('error.expected-got', locale('quote'), locale('punc.quote', quote)));
        }
        return ans;
    }

    /**
     * @throws {ParsingError}
     * @param terminator Ending quote. Will not be included in the result.
     * @param out Stores a mapping from in-string indices to real indices.
     */
    private readUntilQuote(terminator: '"' | '\'', out: { mapping: IndexMapping }, looseEscapeCheck: boolean) {
        const start = this.cursor;
        const escapeChar = '\\';
        let ans = '';
        let escaped = false;
        out.mapping.start = start;
        while (this.canRead()) {
            const c = this.read();
            if (escaped) {
                if (looseEscapeCheck || c === escapeChar || c === terminator) {
                    out.mapping.skipAt = out.mapping.skipAt || [];
                    out.mapping.skipAt.push(ans.length);
                    ans += c;
                    escaped = false;
                } else {
                    this.cursor = start;
                    throw new ParsingError(locale('unexpected-escape', locale('punc.quote', c)));
                }
            } else {
                if (c === escapeChar) escaped = true;
                if (c === terminator) return ans;
                ans += c;
            }
        }
        this.cursor = start;
        throw new ParsingError(locale('error.expected-got', locale('ending-quote', locale('punc.quote', terminator)), locale('nothing')));
    }

    /**
     * @param terminator Ending character. Will not be included in the result.
     */
    readUntilOrEnd(...terminators: string[]): string {
        let ans = '';
        while (this.canRead()) {
            const c = this.peek();
            if (terminators.includes(c)) return ans;
            else ans += c;

            this.skip();
        }
        return ans;
    }

    readLine(): string {
        return this.readUntilOrEnd('\r', '\n');
    }

    /**
     * @throws {ParsingError} If it's not an legal quoted string.
     * @param out Stores a mapping from in-string indices to real indices.
     * @param isReadingJson Whether to read the whole JSON string, including quotes and escaping characters.
     */
    readString(out: { mapping: IndexMapping } = { mapping: {} }, looseEscapeCheck = false): string {
        if (!this.canRead()) {
            out.mapping.start = this.cursor;
            return '';
        }
        const c = this.peek();
        if (StringReader.isQuote(c)) return this.readQuotedString(out, looseEscapeCheck);
        return this.readUnquotedString(out);
    }

    /**
     * @deprecated
     * @throws {ParsingError}
     */
    readBoolean(): boolean {
        const string = this.readString();
        if (string === 'true') return true;
        if (string === 'false') return false;
        throw new ParsingError(locale('error.expected-got', locale('boolean'), locale('punc.quote', string)));

    }

    /**
     * @throws {ParsingError} (tolerable) When the next char can't match the expected one.
     */
    expect(c: string): this {
        if (!this.canRead()) throw new ParsingError(locale('error.expected-got', locale('punc.quote', c), locale('nothing')));
        if (this.peek() !== c) throw new ParsingError(locale('error.expected-got', locale('punc.quote', c), locale('punc.quote', this.peek())));
        return this;
    }

    readRemaining(): string {
        const ans = this.remainingString;
        this.cursor = this.end;
        return ans;
    }

    lastLine(textDoc: TextDocument): this {
        const pos = textDoc.positionAt(this.cursor);
        this.cursor = textDoc.offsetAt(new Position(pos.line - 1, 0));
        return this;
    }

    nextLine(textDoc: TextDocument): this {
        const pos = textDoc.positionAt(this.cursor);
        this.cursor = textDoc.offsetAt(new Position(pos.line + 1, 0));
        return this;
    }

    static canInNumber(c: string): boolean {
        // '+' is illegal in number because Mojang wrote so...
        // https://github.com/Mojang/brigadier/blob/master/src/main/java/com/mojang/brigadier/StringReader.java#L88
        // But it IS legal in NBT numbers, because Mojang used `readUnquotedString` to parse primitive tags in NBT parser.
        return (
            c === '0' || c === '1' || c === '2' || c === '3' ||
            c === '4' || c === '5' || c === '6' || c === '7' ||
            c === '8' || c === '9' || c === '-' || c === '.'
        );
    }

    static isSpace(c: string): boolean {
        return c === ' ' || c === '\t';
    }

    static isWhiteSpace(c: string): boolean {
        return c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\r\n';
    }

    static isLineSeparator(c: string): boolean {
        return c === '\r\n' || c === '\r' || c === '\n';
    }

    /**
     * Whether the string can be used in unquoted string or not.
     * @param string A string.
     */
    static canInUnquotedString(string: string): boolean {
        return /^[0-9a-zA-Z_\-.+]+$/.test(string);
    }

    static isQuote(c: string): c is '"' | '\'' {
        return c === '"' || c === '\'';
    }
}
