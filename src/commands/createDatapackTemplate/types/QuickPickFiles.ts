import { QuickPickItem } from 'vscode';

export interface QuickPickFiles extends QuickPickItem {
    generates: GenerateFileData[],
    func?: () => Promise<GenerateFileData[]>
}

export interface GenerateFileData {
    type: 'file' | 'folder'
    relativeFilePath: string
    content?: string[]
}