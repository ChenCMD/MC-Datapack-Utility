import { FileType } from '../../../types'
import { CallNode, makeCallNode } from '../types/CallNode'

/** `doc` に含まれる `CallNode` を抽出する */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseFile(_doc: string, _ft: FileType): CallNode[] {
  return [makeCallNode('mcdu:unknown', 'Hello')]
}
