import { Replacer } from '../types/Replacer';
import { expressionReplacer } from './expression';
import { serialNumberReplacer } from './serialNumber';
import { stringReplacer } from './string';
import { tagsReplacer } from './tags';

export function getReplacerMap(): Map<string, Replacer> {
    return new Map([
        ['replacer.string', stringReplacer],
        ['replacer.tags', tagsReplacer],
        ['replacer.serial-number', serialNumberReplacer],
        ['replacer.expression', expressionReplacer]
    ]);
}