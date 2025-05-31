import { FileType } from '../../../types/FileTypes'

export type Template = {
  [key in FileType]?: string[]
}
