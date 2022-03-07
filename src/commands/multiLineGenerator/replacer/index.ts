import { Replacer } from '../types/Replacer';
import { expressionReplacer } from './expression';
import { serialNumberReplacer } from './serialNumber';
import { stringReplacer } from './string';
import { tagsReplacer } from './tags';

export function getReplacerMap(): Map<string, [replacer: Replacer, insertCntRequired: boolean]> {
    return new Map([
        ['replacer.string', [stringReplacer, false]],
        ['replacer.tags', [tagsReplacer, false]],
        ['replacer.serial-number', [serialNumberReplacer, true]],
        ['replacer.expression', [expressionReplacer, true]]
    ]);
}