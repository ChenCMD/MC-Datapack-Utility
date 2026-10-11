import type { Config } from '../../../types/Config'
import type { FileType } from '../../../core/datapack/fileTypes'

export interface CursorPosition { line: number, character: number }

export interface CreateFilePorts<U extends { path: string }> {
  getDatapackRoot: (uri: U) => Promise<U | undefined>
  getPackFormat: (root: U) => Promise<number>
  getFileType: (uri: U, root: U, format: number) => FileType | undefined
  isDatapackRoot: (uri: U) => Promise<boolean>
  getDate: (format: string) => string
  getNamespace: (uri: U, root: U) => string
  getResourcePath: (uri: U, root: U, format: number, type?: FileType) => string
  joinPath: (uri: U, ...segments: string[]) => U
  basename: (uri: U) => string
  dirname: (uri: U) => U
  pathAccessible: (uri: U) => Promise<boolean>
  getTextEditor: () => { document: { uri: U } }
  listenInput: (message: string, validate: (value: string) => Promise<string | undefined>) => Promise<string>
  confirmDatapack: (message: string) => Promise<string>
  createDatapack: (config: Config, mode: 'create' | 'add') => Promise<void>
  create: (uri: U, content: Uint8Array) => Promise<void>
  openFile: (uri: U, selection?: CursorPosition) => Promise<void>
  locale: (key: string, ...params: string[]) => string
  showError: (message: string) => void
  log: (message: string) => void
}
