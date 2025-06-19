import vscode, { Uri } from 'vscode'
import { StringReader } from '../../../utils'

function parseArgument(line: StringReader, node: ArgumentNode, captureParserType: string[]): ParserValueMap {
  if (!captureParserType.includes(node.parser)) return []

  return []
}

function parse(line: StringReader, node: RootNode, captureParserType: string[]): ParserValueMap
function parse(line: StringReader, node: ArgumentNode | LiteralNode, captureParserType: string[], head: string, name: string): ParserValueMap
/**
 * @param line 解析する行
 * @param node 参照するコマンド木
 * @param captureParserType どのパーサーを捕捉するか
 * @returns [パーサー名, 値] の配列
 */
function parse(line: StringReader, node: ArgumentNode | LiteralNode | RootNode, captureParserType: string[] = [], head?: string, name?: string): ParserValueMap {
  let acc: ParserValueMap | undefined = undefined

  switch (node.type) {
    case 'argument':
      acc = parseArgument(line, node, captureParserType)
      break
    case 'literal':
      if (name !== head) return []
      line.skip() // スペース1文字をスキップ
      break
    case 'root':
      line.skipSpace()
      if (line.peek() === '#') return [] // コメントはとりあえず無視
      if (line.peek() === '/') line.skip() // 行頭のスラッシュだけ無視可能
      break
    default:
      throw new Error(`未知のノード: ${name}`)
  }

  const nextHead = line.readUnquotedString()
  // Array.flatMap() などのほうが速いかも？
  for (const [childName, childNode] of Object.entries(node.children ?? {})) {
    const childPosition = line.cursor
    const result = parse(line, childNode, captureParserType, nextHead, childName)
    if (result.length > 0) {
      result.push(...acc ?? [])
      return result
    }

    line.cursor = childPosition
  }

  return acc ?? []
}

export async function parseFile(file: Uri): Promise<ParserValueMap> {
  const doc = await vscode.workspace.openTextDocument(file)
  
}