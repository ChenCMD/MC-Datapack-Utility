import { QuickPickItem } from 'vscode'
import { locale } from '../locales'

export type ExtendQuickPickItem<T> = QuickPickItem & { extend: T }

export function makeExtendQuickPickItem<T>(map: Record<string, T>, useLocale = true): ExtendQuickPickItem<T>[] {
    return Object.entries(map).map(([label, extend]) => ({ label: useLocale ? locale(label) : label, extend }))
}
