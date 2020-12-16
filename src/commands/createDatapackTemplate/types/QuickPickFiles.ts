import { QuickPickItem } from 'vscode';
import { ReposGetContentResponseData } from '@octokit/types/dist-types/generated/Endpoints';
import { FileData, FileDataReqContent } from '../../../types/FileData';
import { AskGitHubData } from '../../../types/AskGitHubData';

export interface QuickPickFiles extends QuickPickItem {
    generates: GenerateFileData[]
    func?: GetGitHubDataFunc[]
}

export type GenerateFileData = GenFileData | GenFolderData;

interface GenFileData extends FileDataReqContent {
    type: 'file'
}

interface GenFolderData extends FileData {
    type: 'folder'
}

export interface GetGitHubDataFunc extends AskGitHubData {
    rel: (data: ReposGetContentResponseData) => string
}