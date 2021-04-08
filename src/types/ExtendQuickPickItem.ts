import { QuickPickItem } from 'vscode';

export type ExtendQuickPickItem<T> = QuickPickItem & { extend: T };

export function createQuickPickItemHasIds<T>(map: Map<string, T>): ExtendQuickPickItem<T>[] {
    const messages: ExtendQuickPickItem<T>[] = [];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const label of map.keys()) messages.push({ label, extend: map.get(label)! });
    return messages;
}