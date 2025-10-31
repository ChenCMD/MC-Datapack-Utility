import { Uri } from 'vscode'

export abstract class AbstractNode {
  abstract readonly isGeneratePackMcMeta: boolean

  abstract listenGenerateDir(): Promise<Uri>

  abstract listenDatapackNameAndRoot(directory: Uri): Promise<{ name: string; root: Uri }>

  abstract listenPackFormat(directory: Uri): Promise<number>

  abstract listenDatapackDescription(directory: Uri): Promise<string>

  abstract noticeGenerated(directory: Uri): Promise<void>
}
