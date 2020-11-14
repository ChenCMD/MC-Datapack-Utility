import { QuickPickItem } from 'vscode';
import { ReposGetContentResponseData } from '@octokit/types/dist-types/generated/Endpoints';
import { FileData } from '../../../types/FileData';

export interface QuickPickFiles extends QuickPickItem {
    generates: GenerateFileData[],
    func?: GetGitHubDataFunc[]
}

export interface GenerateFileData extends FileData {
    type: 'file' | 'folder'
}

export interface GetGitHubDataFunc {
    owner: string,
    repo: string,
    ref: string,
    path: string,
    relativeFilePath: (data: ReposGetContentResponseData) => string
}