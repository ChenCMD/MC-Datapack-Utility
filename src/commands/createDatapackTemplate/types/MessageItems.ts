import { MessageItem } from 'vscode';

export interface MessageItemHasId extends MessageItem {
    id: string
}