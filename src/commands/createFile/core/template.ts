import { resolveVars } from '../../../core/templates/variables'
import type { Variables } from '../../../core/templates/variables'
import type { CursorPosition } from './ports'

export function renderFileTemplate(lines: string[], vars: Variables): { content: string, selection: CursorPosition | undefined } {
  let content = ''
  let cursorOffset: number | undefined
  let markedRow = -1
  lines.forEach((line, row) => {
    if (row > 0) content += '\r\n'
    let offset = 0
    const tokens = /%cursor%|%[^%\r\n]+%/gi
    let match: RegExpExecArray | null
    while ((match = tokens.exec(line)) !== null) {
      content += line.slice(offset, match.index)
      const key = match[0].slice(1, -1)
      if (key.toLowerCase() === 'cursor') {
        // Preserve the first marker on the last marked template row.
        if (markedRow !== row) cursorOffset = content.length
        markedRow = row
      } else if (Object.keys(vars).includes(key) || /^[\w.-]+$/.test(key)) {
        content += resolveVars(match[0], vars)
      } else {
        // A literal percent (e.g. "50% ") must not consume a later marker.
        content += '%'
        tokens.lastIndex = match.index + 1
      }
      offset = tokens.lastIndex
    }
    content += line.slice(offset)
  })
  const beforeCursor = cursorOffset === undefined ? undefined : content.slice(0, cursorOffset).split(/\r\n|\r|\n/)
  const selection = beforeCursor && { line: beforeCursor.length - 1, character: beforeCursor[beforeCursor.length - 1].length }
  return { content, selection }
}
