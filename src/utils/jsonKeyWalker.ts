import { StringReader } from '.'
import { arrayToMessage, locale } from '../locales'
import { JsonObject, JsonValue } from '../types'
import { ObjectIsNotArrayError, ParsingError, TypeUnmatchedError, UnimplementedError } from '../types/Error'

export function appendElemFromKey(obj: JsonObject, key: string, elem: JsonValue, addFirst: boolean): [true] | [false, string] {
    try {
        walkObjFromJsonKeyPath(obj, new StringReader(key), elem, ['key', 'index'], false, addFirst)
        return [true]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error instanceof ObjectIsNotArrayError) return [false, 'error.could-not-append-elem']
        if (error instanceof TypeUnmatchedError) return [false, 'error.could-not-access-key']
        throw error
    }
}

function walkObjFromJsonKeyPath(obj: JsonValue, reader: StringReader, elem: JsonValue, parseTypes: ('key' | 'filter' | 'index')[], allowEmpty: boolean, addFirst: boolean): JsonValue {
    if (parseTypes.includes('key') && canParseKey(reader))
        return parseKey(obj, reader, elem, addFirst)
    if (parseTypes.includes('filter') && canParseObjectFilter(reader))
        return parseObjectFilter(obj, reader, elem, addFirst)
    if (parseTypes.includes('index') && canParseIndex(reader))
        return parseIndex(obj, reader, elem, addFirst)
    if (!allowEmpty)
        throw new ParsingError(locale('error.expected-got', arrayToMessage(parseTypes.map(v => locale(`nbt-path.${v}`)), false, 'or'), locale('nothing')))

    if (!Array.isArray(obj))
        throw new ObjectIsNotArrayError()
    if (addFirst)
        obj.unshift(elem)
    else
        obj.push(elem)

    return obj
}


const parseKey = (obj: JsonValue, reader: StringReader, elem: JsonValue, addFirst: boolean): JsonValue => {
    // Type check
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new TypeUnmatchedError()

    let key = ''
    if (StringReader.isQuote(reader.peek()))
        key = reader.readQuotedString()
    else
        while (reader.canRead() && StringReader.canInUnquotedString(reader.peek()) && reader.peek() !== '.') key += reader.read()


    if (canParseSep(reader))
        obj[key] = walkObjFromJsonKeyPath(obj[key], reader.skip(), elem, ['key', 'index'], false, addFirst)
    else
        obj[key] = walkObjFromJsonKeyPath(obj[key], reader, elem, ['filter', 'index'], true, addFirst)
    return obj
}

const parseObjectFilter = (_obj: JsonValue, reader: StringReader, _elem: JsonValue, _addFirst: boolean, _isIndexingFilter = false): JsonValue => {
    reader.skip().skipWhiteSpace()
    throw new UnimplementedError(locale('unimplemented', locale('json-key-path.filter'))) // TODO 未実装処理
    // if (canParseSep(reader))
    //     obj = walkObjFromJsonKeyPath(obj, reader, ['key'], false);
    // else
    //     return undefined;
}

const parseIndex = (obj: JsonValue, reader: StringReader, elem: JsonValue, addFirst: boolean): JsonValue => {
    // Type check
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj)) throw new TypeUnmatchedError()

    reader.skip().skipWhiteSpace()

    if (canParseObjectFilter(reader))
        return parseObjectFilter(obj, reader, elem, addFirst, true)
    else if (canParseIndexNumber(reader))
        return parseIndexNumber(obj, reader, elem, addFirst)
    else
        return multiResult(obj, reader, elem, addFirst)
}

const parseIndexNumber = (obj: JsonValue, reader: StringReader, elem: JsonValue, addFirst: boolean): JsonValue => {
    // Type check
    if (!obj || !Array.isArray(obj)) throw new TypeUnmatchedError()

    const value = reader.readInt()
    reader.skipWhiteSpace().expect(']').skip()

    const index = (value >= 0) ? value : obj.length + value
    if (canParseSep(reader))
        obj[index] = walkObjFromJsonKeyPath(obj[index], reader.skip(), elem, ['key', 'index'], false, addFirst)
    else
        obj[index] = walkObjFromJsonKeyPath(obj[index], reader, elem, ['index'], true, addFirst)
    return obj
}

const multiResult = (obj: JsonValue, reader: StringReader, elem: JsonValue, addFirst: boolean): JsonValue => {
    // Type check
    if (!obj || !Array.isArray(obj)) throw new TypeUnmatchedError()

    reader.skipWhiteSpace().expect(']').skip()

    const walkFunc: (obj: JsonValue, reader: StringReader) => JsonValue = canParseSep(reader)
        ? (_obj, _reader) => walkObjFromJsonKeyPath(_obj, _reader.skip(), elem, ['key', 'index'], false, addFirst)
        : (_obj, _reader) => walkObjFromJsonKeyPath(_obj, _reader, elem, ['index'], true, addFirst)

    const res = obj.map(v => walkFunc(v, reader.clone()))

    if (res.length)
        return res
    else
        throw new TypeUnmatchedError()
}

type Checker = (reader: StringReader) => boolean

const canParseKey: Checker = reader => StringReader.isQuote(reader.peek()) || StringReader.canInUnquotedString(reader.peek())

const canParseSep: Checker = reader => reader.peek() === '.'

const canParseObjectFilter: Checker = reader => reader.peek() === '{'

const canParseIndex: Checker = reader => reader.peek() === '['

const canParseIndexNumber: Checker = reader => StringReader.canInNumber(reader.peek()) || reader.peek() === '+'
