import { config } from '../../../extension';
import { FileType } from '../../../types/FileTypes';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getFileTemplate(fileType: FileType): string[] {
    const fileTemplate: { [key: string]: string[] | undefined } = config.get<{ [key: string]: string[] | undefined }>('createFile.fileTemplate', {});
    return fileTemplate[fileType] ?? [];
}