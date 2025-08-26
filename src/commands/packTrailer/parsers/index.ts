import { FileType } from '../../../types'
import { CallJungle, CallNode, makeCallJungle, makeCallNode, makeNodeForest } from '../types/CallNode'

/** `doc` が持つ階層構造と、`doc` 内で呼び出されているノードの一覧を取得する */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseFile(_doc: string, _ft: FileType, callFrom: CallNode): CallJungle {
  const greeting = makeCallNode('mcdu:unknown', 'Greeting')
  const hello = makeCallNode('mcdu:unknown', 'Hello', greeting)
  const treeGreeting = makeNodeForest()
  treeGreeting.addNode(hello)
  const tree = makeNodeForest()
  tree.addTree(greeting, treeGreeting)
  tree.addNode(callFrom)

  const jungle = makeCallJungle(tree, [[callFrom, hello]])
  return jungle
}
