import { FileType } from '../../../types'
import { StringReader } from '../../../utils'
import { CallNode, makeCallNode } from '../types/CallNode'

/** `doc` に含まれる `CallNode` を抽出する */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseFile(_doc: StringReader, _ft: FileType): CallNode[] {
  return [makeCallNode('brigadier:string', 'Hello')]
}
