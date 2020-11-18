import { QuickPickItem } from 'vscode';
import { ReposGetContentResponseData } from '@octokit/types/dist-types/generated/Endpoints';
import { FileData } from '../../../types/FileData';
import { AskGitHubData } from '../../../types/AskGitHubData';

export interface QuickPickFiles extends QuickPickItem {
    generates: GenerateFileData[],
    func?: GetGitHubDataFunc[]
}

export interface GenerateFileData extends FileData {
    type: 'file' | 'folder'
}

export interface GetGitHubDataFunc extends AskGitHubData {
    rel: (data: ReposGetContentResponseData) => string
}