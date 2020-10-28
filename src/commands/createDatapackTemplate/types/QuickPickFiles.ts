import { QuickPickItem } from 'vscode';
import { ReposGetContentResponseData } from '@octokit/types/dist-types/generated/Endpoints';

export interface QuickPickFiles extends QuickPickItem {
    generates: GenerateFileData[],
    func?: GetGitHubDataFunc[]
}

export interface GenerateFileData {
    type: 'file' | 'folder'
    relativeFilePath: string
    content?: string[]
}

export interface GetGitHubDataFunc {
    owner: string,
    repo: string,
    ref: string,
    path: string,
    relativeFilePath: (data: ReposGetContentResponseData) => string
}