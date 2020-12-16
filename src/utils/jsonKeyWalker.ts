/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
import { arrayToMessage, locale } from '../locales';
import { ParsingError, TypeUnmatchError, UnimplementedError } from '../types/Error';
import { StringReader } from './StringReader';

export function appendElemFromKey(obj: any, key: string, elem: any): [boolean, string] {
    try {
        const res = walkObjFromJsonKeyPath(obj, new StringReader(key), elem, ['key'], false);
        return [!!res, 'could-not-access-key'];
    } catch (error) {
        if (error instanceof TypeUnmatchError) return [false, 'could-not-append-elem'];
        if (error instanceof TypeError) return [false, 'could-not-access-key'];
        throw error;
    }
}

function walkObjFromJsonKeyPath(obj: any, reader: StringReader, elem: any, parseTypes: ('key' | 'filter' | 'index')[], allowEmpty: boolean): any | undefined {
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
        throw new TypeUnmatchError();
    return obj;
}


type Parser = { (obj: any, reader: StringReader, elem: any, otherArgs?: any): any | undefined };

const parseKey: Parser = (obj: { [key: string]: any }, reader, elem) => {
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
};

const parseObjectFilter: Parser = (_obj: { [key: string]: any }, reader, _elem, _isIndexingFilter = false) => {
    reader.skip().skipWhiteSpace();
    throw new UnimplementedError(locale('unimplemented', locale('json-key-path.filter'))); // TODO 未実装処理
    // if (canParseSep(reader))
    //     obj = walkObjFromJsonKeyPath(obj, reader, ['key'], false);
    // else
    //     return undefined;
};

const parseIndex: Parser = (obj: any[], reader, elem) => {
    reader.skip().skipWhiteSpace();

    if (canParseObjectFilter(reader))
        return parseObjectFilter(obj, reader, elem, true);
    else if (canParseIndexNumber(reader))
        return parseIndexNumber(obj, reader, elem);
    else
        return multiResult(obj, reader, elem);
};

const parseIndexNumber: Parser = (obj: any[], reader, elem) => {
    const value = reader.readInt();
    reader.skipWhiteSpace().expect(']').skip();

    const index = (value >= 0) ? value : obj.length + value;
    if (canParseSep(reader))
        obj[index] = walkObjFromJsonKeyPath(obj[index], reader.skip(), elem, ['key', 'index'], false);
    else
        obj[index] = walkObjFromJsonKeyPath(obj[index], reader, elem, ['index'], true);
    return obj;
};

const multiResult: Parser = (obj: any[], reader, elem) => {
    reader.skipWhiteSpace().expect(']').skip();

    let walkFunc: Parser;
    if (canParseSep(reader))
        walkFunc = (_obj, _reader) => walkObjFromJsonKeyPath(_obj, _reader.skip(), elem, ['key', 'index'], false);
    else
        walkFunc = (_obj, _reader) => walkObjFromJsonKeyPath(_obj, _reader, elem, ['index'], true);

    const res = obj.map(v => walkFunc(v, reader.clone(), elem));

    if (res.length === 0)
        return undefined;
    else
        return res;
};

type Checker = { (reader: StringReader): boolean };

const canParseKey: Checker = reader => StringReader.isQuote(reader.peek()) || StringReader.canInUnquotedString(reader.peek());

const canParseSep: Checker = reader => reader.peek() === '.';

const canParseObjectFilter: Checker = reader => reader.peek() === '{';

const canParseIndex: Checker = reader => reader.peek() === '[';

const canParseIndexNumber: Checker = reader => StringReader.canInNumber(reader.peek()) || reader.peek() === '+';