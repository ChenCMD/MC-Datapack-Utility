import { MessageItem } from 'vscode'
import { locale } from '../locales'

export interface MessageItemHasId extends MessageItem {
    id: string
}

export const createMessageItemHasIds = (...ids: string[]): MessageItemHasId[] => {
    const messages: MessageItemHasId[] = []
    for (const id of ids)
        messages.push({ title: locale(id), id })
    return messages
}
