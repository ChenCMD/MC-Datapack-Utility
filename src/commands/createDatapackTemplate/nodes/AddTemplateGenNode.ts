import { locale } from '../../../locales'
import { GenerateError } from '../../../types/Error'
import { isDatapackRoot } from '../../../utils/common'
import { readFile } from '../../../utils/file'
import { listenDir, showInfo } from '../../../utils/vscodeWrapper'
import { AbstractNode } from '../types/AbstractNode'
import { Uri } from 'vscode'
import { UriUtils } from '../../../utils/uri'

export class AddTemplateGenNode extends AbstractNode {
  readonly isGeneratePackMcMeta = false

  async listenGenerateDir(): Promise<Uri> {
    const dir = await listenDir(
      locale('create-datapack-template.dialog-title-datapack'),
      locale('select')
    )

    if (!await isDatapackRoot(dir)) throw new GenerateError(locale('create-datapack-template.not-datapack'))
    return dir
  }

  listenDatapackNameAndRoot(directory: Uri): Promise<{ name: string; root: Uri }> {
    const name = UriUtils.basename(directory)
    const root = directory
    return Promise.resolve({ name, root })
  }

  async listenPackFormat(directory: Uri): Promise<number> {
    try {
      const pf = JSON.parse(await readFile(UriUtils.joinPath(directory, 'pack.mcmeta'))).pack?.pack_format
      if (typeof pf !== 'number')
        throw new GenerateError(locale('create-datapack-template.no-pack-format'))
      return pf
    } catch (err) {
      throw new GenerateError(locale('create-datapack-template.no-pack-format'))
    }
  }

  async listenDatapackDescription(directory: Uri): Promise<string> {
    try {
      return JSON.parse(await readFile(UriUtils.joinPath(directory, 'pack.mcmeta'))).pack?.description ?? ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err instanceof SyntaxError) return ''
      throw err
    }
  }

  async noticeGenerated(): Promise<void> {
    await showInfo(locale('create-datapack-template.complete'))
  }
}
