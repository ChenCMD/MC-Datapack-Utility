import { locale } from '../../../locales'
import { listenInputMultiLine } from '../../../utils'
import { Replacer } from '../types/Replacer'

export const stringReplacer: Replacer = async (insertString, _, { extensionUri }) => {
    const replaceStrings = await listenInputMultiLine(extensionUri, locale('string.string'))
    return replaceStrings.split('\n').map(l => insertString.replace(/%r/g, l))
}