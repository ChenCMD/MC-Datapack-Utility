import { Deque } from '../../utils/Deque'

export interface FormatterEdit {
  kind: 'insert' | 'replace'
  line: number
  newText: string
}

export interface FormatterOptions {
  indent: string
  eol: '\n' | '\r\n'
  insertHeader: boolean
  resourcePath?: string
}

/** Plan edits from document lines without loading VS Code or accessing files. */
export function formatMcfunction(lines: readonly string[], options: FormatterOptions): FormatterEdit[] {
  const { indent, eol, insertHeader, resourcePath } = options
  const edits: FormatterEdit[] = []
  if (insertHeader) {
    if (resourcePath !== undefined && lines[0] !== `#> ${resourcePath}`)
      edits.push({ kind: 'insert', line: 0, newText: `#> ${resourcePath}${eol}` })
    // Preserve the existing unconditional blank line, including repeated formatting.
    edits.push({ kind: 'insert', line: 0, newText: eol })
  }
  return [...edits, ...formatIndentation(lines, indent, eol)]
}

function formatIndentation(lines: readonly string[], indent: string, eol: string): FormatterEdit[] {
  const editQueue: FormatterEdit[] = []

  const depth = new Deque<number>()
  let lastLineType: 'comment' | 'blankLine' | 'special' | 'command' = 'blankLine'

  let indents = 0

  const next = (lineNumber: number, line: string, _indents: number) => {
    editQueue.push({ kind: 'replace', line: lineNumber, newText: indent.repeat(_indents) + line + eol })
  }

  for (let lineCount = 0; lineCount < lines.length; lineCount++) {
    // Match StringReader's space skipping and readLine behavior, including a
    // standalone carriage return within a VS Code document line.
    const line = lines[lineCount].replace(/^[ \t]*/, '').split('\r')[0]
    // 改行
    if (line === '') {
      if (depth.size() > 0)
        depth.removeLast()

      lastLineType = 'blankLine'

      next(lineCount, '', 0)
      continue
    }

    let numSigns = 0
    while (line[numSigns] === '#') numSigns++

    // コマンドについての処理
    if (numSigns === 0) {
      indents = depth.size()
      indents += lastLineType === 'special' ? 1 : 0
      lastLineType = 'command'

      next(lineCount, line, indents)
      continue
    }

    // コメントについての処理
    switch (line.slice(numSigns, line.indexOf(' '))) {
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
    next(lineCount, line, indents)
  }

  if (lastLineType === 'blankLine') editQueue.pop()

  return editQueue
}
