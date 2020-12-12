import { FileType } from '../../../types/FileTypes';
import { Template } from '../types/Template';

export function getFileTemplate(templates: Template, fileType: FileType): string[] {
    return templates[fileType] ?? [];
}