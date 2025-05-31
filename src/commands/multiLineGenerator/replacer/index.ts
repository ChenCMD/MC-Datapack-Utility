import { expressionReplacer } from './expression'
import { serialNumberReplacer } from './serialNumber'
import { stringReplacer } from './string'
import { tagsReplacer } from './tags'

export const replacerMap = {
    'replacer.string': [stringReplacer, false],
    'replacer.tags': [tagsReplacer, false],
    'replacer.serial-number': [serialNumberReplacer, true],
    'replacer.expression': [expressionReplacer, true]
} as const
