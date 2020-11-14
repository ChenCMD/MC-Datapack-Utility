import { FileType } from '../../../types/FileTypes';
import { Template } from '../types/Template';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getFileTemplate(templates: Template, fileType: FileType): string[] {
    return templates[fileType] ?? [];
}