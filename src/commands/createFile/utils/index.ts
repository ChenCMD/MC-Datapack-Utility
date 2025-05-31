import { FileType } from '../../../types/FileTypes'
import { Template } from '../types/Template'

export const getFileTemplate = (templates: Template, fileType: FileType): string[] => templates[fileType] ?? []
