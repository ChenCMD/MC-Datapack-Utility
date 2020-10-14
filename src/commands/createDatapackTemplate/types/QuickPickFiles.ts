import { QuickPickItem } from 'vscode';

export interface QuickPickFiles extends QuickPickItem {
    changes: GenerateFileData[]
}

export interface GenerateFileData {
    type: 'file' | 'folder'
    relativeFilePath: string
    content?: string[]
}