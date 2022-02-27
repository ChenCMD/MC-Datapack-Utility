import { QuickPickItem } from 'vscode';
import { locale } from '../locales';

export type ExtendQuickPickItem<T> = QuickPickItem & { extend: T };

export function makeExtendQuickPickItem<T>(map: Map<string, T>, useLocale = true): ExtendQuickPickItem<T>[] {
    const messages: ExtendQuickPickItem<T>[] = [];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const label of map.keys()) messages.push({ label: useLocale ? locale(label) : label, extend: map.get(label)! });
    return messages;
}