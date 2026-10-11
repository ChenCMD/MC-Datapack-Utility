import type { JsonObject, JsonValue } from '../../../types/JsonObject'
import type { FileDataReqContent } from '../../../types/FileData'
import type { GetGitHubDataFunc, QuickPickFiles } from '../types/QuickPickFiles'

export interface DatapackGenerator<U> {
  readonly isGeneratePackMcMeta: boolean
  listenGenerateDir(): Promise<U>
  listenDatapackNameAndRoot(directory: U): Promise<{ name: string; root: U }>
  listenPackFormat(directory: U): Promise<number>
  listenDatapackDescription(directory: U): Promise<string>
  noticeGenerated(directory: U): Promise<void>
}

type ProgressReport = (value: { increment?: number; message?: string }) => void

export interface DatapackPorts<U> {
  selectGenerator(type?: 'add' | 'create'): Promise<DatapackGenerator<U>>
  getFsPath(uri: U): string
  getPath(uri: U): string
  joinPath(root: U, relative: string): U
  locale(key: string, ...params: (string | number)[]): string
  getDate(format: string): string
  getIndent(uri: U): number
  getResourcePath(uri: U, root: U, packFormat: number): string
  listenInput(question: string, validate?: (value: string) => string | undefined): Promise<string>
  listenPickItem(placeholder: string, items: QuickPickFiles[], multiple: true): Promise<QuickPickFiles[]>
  stringValidator(value: string, options: { invalidCharRegex: RegExp; emptyMessage: string }): string | undefined
  defaultTemplates(packFormat: number): { [key in '#load & #tick' | 'Vanilla data' | 'Folders']: QuickPickFiles[] }
  createProgressBar<T>(title: string, task: (report: ProgressReport) => Promise<T>): Promise<T>
  getVanillaData(version: string, source: GetGitHubDataFunc, relative: GetGitHubDataFunc['rel'], report: (index: number, total: number) => void): Promise<FileDataReqContent[]>
  createDirectory(uri: U): Promise<void>
  pathAccessible(uri: U): Promise<boolean>
  createFile(uri: U, content: string): Promise<void>
  readFile(uri: U): Promise<string>
  writeFile(uri: U, content: string): Promise<void>
  appendElemFromKey(object: JsonObject, key: string, value: JsonValue, first: boolean): [true] | [false, string]
  showError(message: string): void
  log(message: string): void
}
