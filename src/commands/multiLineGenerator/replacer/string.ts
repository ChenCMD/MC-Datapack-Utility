import { locale } from '../../../locales';
import { listenInputMultiLine } from '../../../utils';
import { Replacer } from '../types/Replacer';

export const stringReplacer: Replacer = async (insertString, _, { extensionUri }) => {
    const replaceStrings = await listenInputMultiLine(extensionUri, locale('string.string'));
    const ans: string[] = [];
    for (const line of replaceStrings.split('\n'))
        ans.push(insertString.replace(/%r/g, line));
    return ans;
};