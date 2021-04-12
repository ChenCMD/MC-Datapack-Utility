import { arrayToMessage, locale } from '../locales';
import { JsonObject, JsonValue } from '../types';
import { ObjectIsNotArrayError, ParsingError, TypeUnmatchError, UnimplementedError } from '../types/Error';
import { StringReader } from './StringReader';

export function appendElemFromKey(obj: JsonObject, key: string, elem: JsonValue): [true] | [false, string] {
    try {
        walkObjFromJsonKeyPath(obj, new StringReader(key), elem, ['key'], false);
        return [true];
    } catch (error) {
        if (error instanceof ObjectIsNotArrayError) return [false, 'could-not-append-elem'];
        if (error instanceof TypeUnmatchError) return [false, 'could-not-access-key'];
        throw error;
    }
}

function walkObjFromJsonKeyPath(obj: JsonValue, reader: StringReader, elem: JsonValue, parseTypes: ('key' | 'filter' | 'index')[], allowEmpty: boolean): JsonValue {
    if (parseTypes.includes('key') && canParseKey(reader))
        return parseKey(obj, reader, elem);
    if (parseTypes.includes('filter') && canParseObjectFilter(reader))
        return parseObjectFilter(obj, reader, elem);
    if (parseTypes.includes('index') && canParseIndex(reader))
        return parseIndex(obj, reader, elem);
    if (!allowEmpty)
        throw new ParsingError(locale('expected-got', arrayToMessage(parseTypes.map(v => locale(`nbt-path.${v}`)), false, 'or'), locale('nothing')));

    if (Array.isArray(obj))
        obj.push(elem);
    else
        throw new ObjectIsNotArrayError();
    return obj;
}


function parseKey(obj: JsonValue, reader: StringReader, elem: JsonValue): JsonValue {
    // Type check
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new TypeUnmatchError();

    let key = '';
    if (StringReader.isQuote(reader.peek()))
        key = reader.readQuotedString();
    else
        while (reader.canRead() && StringReader.canInUnquotedString(reader.peek()) && reader.peek() !== '.') key += reader.read();


    if (canParseSep(reader))
        obj[key] = walkObjFromJsonKeyPath(obj[key], reader.skip(), elem, ['key', 'index'], false);
    else
        obj[key] = walkObjFromJsonKeyPath(obj[key], reader, elem, ['filter', 'index'], true);
    return obj;
}

function parseObjectFilter(_obj: JsonValue, reader: StringReader, _elem: JsonValue, _isIndexingFilter = false): JsonValue {
    reader.skip().skipWhiteSpace();
    throw new UnimplementedError(locale('unimplemented', locale('json-key-path.filter'))); // TODO 未実装処理
    // if (canParseSep(reader))
    //     obj = walkObjFromJsonKeyPath(obj, reader, ['key'], false);
    // else
    //     return undefined;
}

function parseIndex(obj: JsonValue, reader: StringReader, elem: JsonValue): JsonValue {
    reader.skip().skipWhiteSpace();

    if (canParseObjectFilter(reader))
        return parseObjectFilter(obj, reader, elem, true);
    else if (canParseIndexNumber(reader))
        return parseIndexNumber(obj, reader, elem);
    else
        return multiResult(obj, reader, elem);
}

function parseIndexNumber(obj: JsonValue, reader: StringReader, elem: JsonValue): JsonValue {
    // Type check
    if (!obj || !Array.isArray(obj)) throw new TypeUnmatchError();

    const value = reader.readInt();
    reader.skipWhiteSpace().expect(']').skip();

    const index = (value >= 0) ? value : obj.length + value;
    if (canParseSep(reader))
        obj[index] = walkObjFromJsonKeyPath(obj[index], reader.skip(), elem, ['key', 'index'], false);
    else
        obj[index] = walkObjFromJsonKeyPath(obj[index], reader, elem, ['index'], true);
    return obj;
}

function multiResult(obj: JsonValue, reader: StringReader, elem: JsonValue): JsonValue {
    // Type check
    if (!obj || !Array.isArray(obj)) throw new TypeUnmatchError();

    reader.skipWhiteSpace().expect(']').skip();

    const walkFunc: (obj: JsonValue, reader: StringReader) => JsonValue = canParseSep(reader)
        ? (_obj, _reader) => walkObjFromJsonKeyPath(_obj, _reader.skip(), elem, ['key', 'index'], false)
        : (_obj, _reader) => walkObjFromJsonKeyPath(_obj, _reader, elem, ['index'], true);

    const res = obj.map(v => walkFunc(v, reader.clone()));

    if (res.length)
        return res;
    else
        throw new TypeUnmatchError();
}

type Checker = (reader: StringReader) => boolean;

const canParseKey: Checker = reader => StringReader.isQuote(reader.peek()) || StringReader.canInUnquotedString(reader.peek());

const canParseSep: Checker = reader => reader.peek() === '.';

const canParseObjectFilter: Checker = reader => reader.peek() === '{';

const canParseIndex: Checker = reader => reader.peek() === '[';

const canParseIndexNumber: Checker = reader => StringReader.canInNumber(reader.peek()) || reader.peek() === '+';