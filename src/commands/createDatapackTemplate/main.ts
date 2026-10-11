import { appendElemFromKey, createFile, createProgressBar, getDate, getIndent, getResourcePath, getVanillaData, listenInput, listenPickItem, pathAccessible, readFile, showError, stringValidator, writeFile } from '../../utils'
import { Config, makeExtendQuickPickItem } from '../../types'
import { locale } from '../../locales'
import { pickItems } from './utils/data'
import { genNodeTypeMap } from './nodes'
import { codeConsole, versionInformation } from '../../extension'
import { TextEncoder } from 'util'
import { Uri, workspace } from 'vscode'
import { UriUtils } from '../../utils/uri'
import { createDatapackCommand } from './core/command'

export const createDatapack = async (config: Config, generateType?: 'add' | 'create'): Promise<void> => {
  const command = createDatapackCommand<Uri>({
    selectGenerator: async type => {
      const generatorNode = type
        ? genNodeTypeMap[`create-datapack-template.${type}`]
        : (await listenPickItem('', makeExtendQuickPickItem(genNodeTypeMap), false)).extend
      return new generatorNode()
    },
    getFsPath: uri => uri.fsPath,
    getPath: uri => uri.path,
    joinPath: UriUtils.joinPath,
    locale, getDate, getIndent, getResourcePath,
    listenInput, listenPickItem, stringValidator,
    defaultTemplates: pickItems,
    createProgressBar,
    getVanillaData: (version, source, relative, report) => getVanillaData(version, versionInformation, source, relative, report),
    createDirectory: async uri => {
      await workspace.fs.createDirectory(uri)
    },
    pathAccessible,
    createFile: (uri, content) => createFile(uri, new TextEncoder().encode(content)),
    readFile, writeFile, appendElemFromKey, showError,
    log: message => codeConsole.appendLine(message)
  })
  await command(config, generateType)
}
