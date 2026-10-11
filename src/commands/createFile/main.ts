import { Range, Uri, window } from 'vscode'
import { pathAccessible, createFile as create } from '../../utils/file'
import { getDatapackRoot, getDate, getNamespace, getPackFormat, getResourcePath, isDatapackRoot } from '../../utils/common'
import { getTextEditor, listenInput, showError } from '../../utils/vscodeWrapper'
import { locale } from '../../locales'
import { getFileType } from '../../types/FileTypes'
import { codeConsole } from '../../extension'
import { createMessageItemHasIds } from '../../types/MessageItemHasId'
import { createDatapack } from '../createDatapackTemplate/main'
import { UriUtils } from '../../utils/uri'
import type { Config } from '../../types/Config'
import { createFileCommand } from './core/command'

// Resolve adapters at invocation time, preserving live bindings across activation cycles.
export const createFile = (uri: Uri, config: Config): Promise<void> => createFileCommand<Uri>({
  getDatapackRoot, getDate, getNamespace, getPackFormat, getResourcePath, isDatapackRoot,
  getFileType, getTextEditor, listenInput, pathAccessible, create, createDatapack, locale,
  joinPath: UriUtils.joinPath, basename: UriUtils.basename, dirname: UriUtils.dirname,
  confirmDatapack: message => showError(message, false, createMessageItemHasIds('yes', 'no'), ['no']),
  showError: message => { showError(message) },
  log: message => codeConsole.appendLine(message),
  openFile: async (uri, selection) => {
    const range = selection && new Range(selection.line, selection.character, selection.line, selection.character)
    await window.showTextDocument(uri, { selection: range })
  }
})(uri, config)
