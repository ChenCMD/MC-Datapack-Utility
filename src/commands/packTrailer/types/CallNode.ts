import { EscapedChar, makeEscapedChar } from './EscapedChar'
import { ParserType } from './ParserType'

export type CallNode = `${ParserType}$${EscapedChar}` & { readonly _brand: 'CallNode' }

export function makeCallNode(type: ParserType, arg: string): CallNode {
  return `${type}$${makeEscapedChar(arg)}` as CallNode
}

export type CallPair = {
  from: CallNode
  to: CallNode
}
