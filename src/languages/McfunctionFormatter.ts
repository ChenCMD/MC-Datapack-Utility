import { DocumentFormattingEditProvider, FormattingOptions, Position, Range, TextDocument, TextEdit } from 'vscode'
import type { Config } from '../types/Config'
import { getEolString } from '../utils/vscodeWrapper'
import { getDatapackRoot, getPackFormat, getResourcePath } from '../utils/common'
import { formatMcfunction } from './core/formatter'

export class McfunctionFormatter implements DocumentFormattingEditProvider {
  constructor(private _config: Config) { }

  set config(_config: Config) {
    this._config = _config
  }

  async provideDocumentFormattingEdits(document: TextDocument, option: FormattingOptions): Promise<TextEdit[]> {
    const insertHeader = this._config.mcfFormatter.doInsertIMPDocument
    const resourcePath = insertHeader ? await this.resolveResourcePath(document) : undefined
    const lines = Array.from({ length: document.lineCount }, (_, index) => document.lineAt(index).text)
    const edits = formatMcfunction(lines, {
      indent: option.insertSpaces ? ' '.repeat(option.tabSize) : '\t',
      eol: getEolString(document.eol),
      insertHeader,
      resourcePath
    })
    return edits.map(edit => edit.kind === 'insert'
      ? TextEdit.insert(new Position(edit.line, 0), edit.newText)
      : TextEdit.replace(new Range(edit.line, 0, edit.line + 1, 0), edit.newText))
  }

  private async resolveResourcePath(document: TextDocument): Promise<string | undefined> {
    const rootPath = await getDatapackRoot(document.uri)
    if (!rootPath) return undefined
    const packFormat = await getPackFormat(rootPath)
    return getResourcePath(document.uri, rootPath, packFormat, 'function')
  }
}
