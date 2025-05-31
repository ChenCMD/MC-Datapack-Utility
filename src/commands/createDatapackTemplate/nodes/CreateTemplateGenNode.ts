import path from 'path'
import { locale } from '../../../locales'
import { createMessageItemHasIds } from '../../../types/MessageItemHasId'
import { getDatapackRoot, isDatapackRoot } from '../../../utils/common'
import { listenDir, listenInput, showWarning, stringValidator } from '../../../utils/vscodeWrapper'
import { AbstractNode } from '../types/AbstractNode'

export class CreateTemplateGenNode extends AbstractNode {
  readonly isGeneratePackMcMeta = true

  async listenGenerateDir(): Promise<string> {
    const dir = await listenDir(
      locale('create-datapack-template.dialog-title-directory'),
      locale('select')
    ).then(v => v.fsPath)

    const datapackRoot = await getDatapackRoot(dir)
    if (datapackRoot) {
      const warningMessage = locale('create-datapack-template.inside-datapack', path.basename(datapackRoot))
      const result = await showWarning(warningMessage, false, createMessageItemHasIds('yes', 'reselect', 'no'), ['no'])
      if (result === 'reselect') return await this.listenGenerateDir()
    }
    return dir
  }

  async listenDatapackNameAndRoot(directory: string): Promise<{ name: string; root: string }> {
    const name = await listenInput(
      locale('datapack-name'),
      v => stringValidator(v, { invalidCharRegex: /[\\/:*?"<>|]/g, emptyMessage: locale('error.input-blank', locale('datapack-name')) })
    )
    const root = path.join(directory, name)

    if (await isDatapackRoot(root)) {
      const warningMessage = locale('create-datapack-template.duplicate-datapack', path.basename(root))
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
}
