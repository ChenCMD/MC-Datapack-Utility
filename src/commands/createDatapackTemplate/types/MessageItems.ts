import { MessageItem } from 'vscode';
import { locale } from '../../../locales';

export interface MessageItemHasId extends MessageItem {
    id: string
}

export function createMessageItemsHasId(id: string): MessageItemHasId {
    return {
        title: locale(id),
        id: id
    };
}