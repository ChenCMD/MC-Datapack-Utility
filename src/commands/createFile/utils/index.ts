import { config } from '../../../extension';
import { FileType } from '../../../types/FileTypes';
import { Template } from '../types/Template';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getFileTemplate(fileType: FileType): string[] {
    const fileTemplate: Template = config.createFile.fileTemplate;
    return fileTemplate[fileType] ?? [];
}