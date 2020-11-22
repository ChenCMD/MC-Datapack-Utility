import { QuickPickItem } from 'vscode';
import { locale } from '../locales';

export interface QuickPickItemHasId extends QuickPickItem {
    id: string
}

export function createQuickPickItemHasIds(...ids: string[]): QuickPickItemHasId[] {
    const messages: QuickPickItemHasId[] = [];
    for (const id of ids)
        messages.push({ label: locale(id), id });
    return messages;
}