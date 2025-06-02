import { DocumentFormattingEditProvider, FormattingOptions, Position, Range, TextDocument, TextEdit } from 'vscode'
import { Config } from '../types'
import { Deque, getEolString, getPackFormat } from '../utils'
import { getDatapackRoot, getResourcePath } from '../utils/common'
import { StringReader } from '../utils/StringReader'

export class McfunctionFormatter implements DocumentFormattingEditProvider {
  constructor(private _config: Config) { }

  set config(_config: Config) {
    this._config = _config
  }

  async provideDocumentFormattingEdits(document: TextDocument, option: FormattingOptions): Promise<TextEdit[]> {
    const indent = option.insertSpaces ? ' '.repeat(option.tabSize) : '\t'
    const eol = getEolString(document.eol)

    const edits: TextEdit[] = []

    if (this._config.mcfFormatter.doInsertIMPDocument) {
      const protocol = await this.insertResourcePath(document, eol)
      if (protocol)
        edits.push(protocol)

      edits.push(TextEdit.insert(new Position(0, 0), eol))
    }
    edits.push(...this.insertIndent(document, indent, eol))

    return edits
  }

  private insertIndent(document: TextDocument, indent: string, eol: string): TextEdit[] {
    const editQueue: TextEdit[] = []

    const depth = new Deque<number>()
    let lastLineType: 'comment' | 'blankLine' | 'special' | 'command' = 'blankLine'

    const docText = new StringReader(document.getText())

    let indents = 0

    const next = (range: Range, line: string, _indents: number) => {
      editQueue.push(TextEdit.replace(range, indent.repeat(_indents) + line + eol))

      docText.nextLine(document)
    }

    for (let lineCount = 0; lineCount < document.lineCount; lineCount++) {
      docText.skipSpace()
      const lineStart = docText.cursor
      const line = docText.readLine()
      const range = new Range(lineCount, 0, lineCount + 1, 0)

      // 改行
      if (line === '') {
        if (depth.size() > 0)
          depth.removeLast()

        lastLineType = 'blankLine'

        next(range, '', 0)
        continue
      }

      // StringReader#readLine() で cursor が移動してしまうため
      docText.cursor = lineStart

      while (docText.peek() === '#') docText.skip()
      const numSigns = docText.cursor - lineStart

      // コマンドについての処理
      if (numSigns === 0) {
        indents = depth.size()
        indents += lastLineType === 'special' ? 1 : 0
        lastLineType = 'command'

        next(range, line, indents)
        continue
      }

      // コメントについての処理
      switch (line.slice(docText.cursor - lineStart, line.indexOf(' '))) {
        case '': // 「# ～」や「## ～」の場合
          if (!(lastLineType === 'comment' && numSigns === depth.getLast()))
            // 前line の # の数を記憶し、現line と同じであれば 連続するコメント とみなす。
            depth.addLast(numSigns)

          indents = Math.max(depth.size() - 1, 0)
          lastLineType = 'comment'
          break

        case 'declare': // 「#declare ～」「#define ～」の場合
        case 'define':
          indents = depth.size()
          lastLineType = 'special'
          break

        case '>': // 「#> ～」の場合
          depth.clear()
          depth.addLast(numSigns)

          indents = 0
          lastLineType = 'comment'
          break
      }
      next(range, line, indents)
    }

    if (lastLineType === 'blankLine') editQueue.pop()

    return editQueue
  }

  private async insertResourcePath(document: TextDocument, eol: string): Promise<TextEdit | undefined> {
    const rootPath = await getDatapackRoot(document.fileName)

    if (!rootPath) return undefined

    // pack_format の取得
    const packFormat = await getPackFormat(rootPath)

    const resourcePath = getResourcePath(document.uri.fsPath, rootPath, packFormat, 'function')
    if (document.lineAt(0).text !== `#> ${resourcePath}`)
      return TextEdit.insert(new Position(0, 0), `#> ${resourcePath}${eol}`)

    return undefined
  }
}
