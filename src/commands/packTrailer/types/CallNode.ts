import { EscapedChar, makeEscapedChar } from './EscapedChar'
import { ParserType } from './ParserType'

export type CallNode = Readonly<{
  type: ParserType
  arg: string
  parent?: CallNode
}>

export function makeCallNode(type: ParserType, arg: string, parent?: CallNode): CallNode {
  return { type, arg, parent } as CallNode
}

export function getLabel(node: CallNode): EscapedChar {
  const tagPrefix = node.type.startsWith('tag/') ? '#' : ''
  return makeEscapedChar(`${tagPrefix}${node.arg}`)
}

export interface NodeForest {
  sparse: Set<CallNode>
  dense: Map<CallNode, NodeForest>

  addNode(node: CallNode): void
  addTree(node: CallNode, tree: NodeForest): void
  topLevels(): CallNode[]
}

export function makeNodeForest(): NodeForest {
  const sparse = new Set<CallNode>()
  const dense = new Map<CallNode, NodeForest>()
  
  return {
    sparse,
    dense,
    addNode(node) {
      if (!dense.has(node)) sparse.add(node)
    },
    addTree(node, tree) {
      if (sparse.has(node)) sparse.delete(node)
      dense.set(node, tree)
    },
    topLevels() {
      return [...sparse, ...dense.keys()]
    }
  }
}

export type CallJungle = {
  forest: NodeForest
  relation: [CallNode, CallNode][]
  join(other: CallJungle): void
}

export function makeCallJungle(): CallJungle
export function makeCallJungle(forest: NodeForest, relation: [CallNode, CallNode][]): CallJungle
export function makeCallJungle(forest?: NodeForest, relation?: [CallNode, CallNode][]): CallJungle {
  forest = forest ?? makeNodeForest()
  relation = relation ?? []

  return {
    forest,
    relation,
    join(other) {
      for (const [node, tree] of other.forest.dense)
        forest.addTree(node, tree)
      for (const node of other.forest.sparse)
        forest.addNode(node)

      relation.push(...other.relation)
    }
  }
}