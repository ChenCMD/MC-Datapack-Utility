import { locale } from '../../../locales';
import { Replacer } from '../types/Replacer';
import { expressionReplacer } from './expression';
import { serialNumberReplacer } from './serialNumber';
import { stringReplacer } from './string';
import { tagsReplacer } from './tags';

export function getReplacerMap(): Map<string, Replacer> {
    const res = new Map<string, Replacer>();
    res.set(locale('replacer.string'), stringReplacer);
    res.set(locale('replacer.tags'), tagsReplacer);
    res.set(locale('replacer.serial-number'), serialNumberReplacer);
    res.set(locale('replacer.expression'), expressionReplacer);
    return res;
}