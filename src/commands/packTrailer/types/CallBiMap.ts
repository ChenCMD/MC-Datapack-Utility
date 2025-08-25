import { CallNode, CallPair } from './CallNode'
import { Graph, makeGraphDefinition, GraphRelation, makeGraphClick, makeGraphRelation } from './MermaidHelper'

export type CallBiMap = {
  ofFrom: { [from: CallNode]: CallNode[] }
  ofTo: { [to: CallNode]: CallNode[] }
}

export function register(map: CallBiMap, ...pairs: CallPair[]): void {
  for (const {from, to} of pairs) {
    if (!map.ofFrom[from]) map.ofFrom[from] = []
    if (!map.ofTo[to]) map.ofTo[to] = []

    map.ofFrom[from].push(to)
    map.ofTo[to].push(from)
  }
}

export function getCallees(map: CallBiMap, node: CallNode): CallNode[] {
  return map.ofFrom[node] || []
}

export function getCallers(map: CallBiMap, node: CallNode): CallNode[] {
  return map.ofTo[node] || []
}

export function getRelative(map: CallBiMap, node: CallNode, depth: number): Graph {
  const [nodes, rels] = _getRelative(map, node, depth)

  return { def: new Set(nodes.map(makeGraphDefinition)), rel: new Set(rels), click: new Set(makeGraphClick(nodes)) }
}

/** 停止性は `depth` が保証。時間がかかるなら並列処理するかも。 */
function _getRelative(map: CallBiMap, node: CallNode, depth: number): [CallNode[], GraphRelation[]] {
  if (depth <= 0 || !Number.isSafeInteger(depth)) return [[node], []]

  const nodes: CallNode[] = [node]
  const rels: GraphRelation[] = []
  for (const callee of getCallees(map, node)) {
    const [childNodes, childRels] = _getRelative(map, callee, depth - 1)
    nodes.push(...childNodes)
    rels.push(...childRels, makeGraphRelation(node, callee))
  }

  for (const caller of getCallers(map, node)) {
    const [childNodes, childRels] = _getRelative(map, caller, depth - 1)
    nodes.push(...childNodes)
    rels.push(...childRels, makeGraphRelation(caller, node))
  }

  return [nodes, rels]
}
