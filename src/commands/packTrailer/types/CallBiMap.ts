import { CallNode, CallPair } from './CallNode'
import { GraphSection, makeGraphDefinition, GraphDefinition, GraphRelation } from './MermaidHelper'

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
}/** 停止性は `depth` が保証。時間がかかるなら並列処理するかも。 */

export function getRelative(map: CallBiMap, node: CallNode, depth: number): GraphSection {
  if (depth <= 0 || !Number.isSafeInteger(depth)) return { def: new Set([makeGraphDefinition(node)]), rel: new Set() }

  const defs: GraphDefinition[] = [makeGraphDefinition(node)]
  const rels: GraphRelation[] = []
  for (const callee of getCallees(map, node)) {
    const { def, rel } = getRelative(map, callee, depth - 1)
    defs.push(...def)
    rels.push(...rel, `${node} --> ${callee}`)
  }

  for (const caller of getCallers(map, node)) {
    const { def, rel } = getRelative(map, caller, depth - 1)
    defs.push(...def)
    rels.push(...rel, `${caller} --> ${node}`)
  }

  return { def: new Set(defs), rel: new Set(rels) }
}

