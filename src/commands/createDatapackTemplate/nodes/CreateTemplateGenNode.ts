import { locale } from '../../../locales'
import { createMessageItemHasIds } from '../../../types/MessageItemHasId'
import { getDatapackRoot, isDatapackRoot } from '../../../utils/common'
import { listenDir, listenInput, showInfo, showWarning, stringValidator } from '../../../utils/vscodeWrapper'
import { AbstractNode } from '../types/AbstractNode'
import { commands, Uri } from 'vscode'
import { UriUtils } from '../../../utils/uri'

export class CreateTemplateGenNode extends AbstractNode {
  readonly isGeneratePackMcMeta = true

  async listenGenerateDir(): Promise<Uri> {
    const dir = await listenDir(
      locale('create-datapack-template.dialog-title-directory'),
      locale('select')
    )

    const datapackRoot = await getDatapackRoot(dir)
    if (datapackRoot) {
      const warningMessage = locale('create-datapack-template.inside-datapack', UriUtils.basename(datapackRoot))
      const result = await showWarning(warningMessage, false, createMessageItemHasIds('yes', 'reselect', 'no'), ['no'])
      if (result === 'reselect') return await this.listenGenerateDir()
    }
    return dir
  }

  async listenDatapackNameAndRoot(directory: Uri): Promise<{ name: string; root: Uri }> {
    const name = await listenInput(
      locale('datapack-name'),
      v => stringValidator(v, { invalidCharRegex: /[\\/:*?"<>|]/g, emptyMessage: locale('error.input-blank', locale('datapack-name')) })
    )
    const root = UriUtils.joinPath(directory, name)

    if (await isDatapackRoot(root)) {
      const warningMessage = locale('create-datapack-template.duplicate-datapack', UriUtils.basename(root))
      const result = await showWarning(warningMessage, false, createMessageItemHasIds('yes', 'rename', 'no'), ['no'])
      if (result === 'rename') return await this.listenDatapackNameAndRoot(directory)
    }

    return { name, root }
  }

  async listenPackFormat(): Promise<number> {
    const rawPf = await listenInput(locale('pack-format'), v => {
      const num = parseInt(v, 10)
      if (isNaN(num) || num < 1) return locale('error.invalid-number')
      return undefined
    })
    return parseInt(rawPf)
  }

  async listenDatapackDescription(): Promise<string> {
    return await listenInput(locale('datapack-description'))
  }

  async noticeGenerated(directory: Uri): Promise<void> {
    const res = await showInfo(
      locale('create-datapack-template.complete-create'),
      false,
      createMessageItemHasIds('open', 'no')
    )

    if (res === 'open')
      await commands.executeCommand('vscode.openFolder', directory, { forceNewWindow: true })
  }
}
