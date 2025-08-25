import { EscapedChar, makeEscapedChar } from './EscapedChar'
import { ParserType } from './ParserType'

export type CallNode = `${ParserType}$${EscapedChar}` & { readonly _brand: 'CallNode' }

export function makeCallNode(type: ParserType, arg: string): CallNode {
  return `${type}$${makeEscapedChar(arg)}` as CallNode
}

export function getType(node: CallNode): ParserType {
  return node.split('$')[0] as ParserType
}

export function getLabel(node: CallNode): string {
  const [type, label] = node.split('$')
  const tagPrefix = type.startsWith('tag/') ? '&#35' : ''
  return `${tagPrefix}${label}`
}

export type CallPair = {
  from: CallNode
  to: CallNode
}
