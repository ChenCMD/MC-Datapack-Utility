import { QuickPickItem, Uri } from 'vscode'

export interface QuickPickFiles extends QuickPickItem {
    changes: fileData[]
}

export interface fileData {
    type: 'file' | 'folder'
    fileUri: Uri
    content?: string[]
}