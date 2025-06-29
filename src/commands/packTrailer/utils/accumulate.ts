import { CallBiMap } from '../types/CallBiMap'
import { asMermaidNode, CallNode } from '../types/CallNode'
import { GraphDefinition, GraphRelation, GraphSection } from '../types/MermaidHelper'

export function getRelative(known: CallBiMap, node: CallNode, depth: number): GraphSection {
  if (depth <= 0) return { def: new Set([asMermaidNode(node)]), rel: new Set() }

  const defs: GraphDefinition[] = [asMermaidNode(node)]
  const rels: GraphRelation[] = []
  for (const callee of known.getCallees(node)) {
    const { def, rel } = getRelative(known, callee, depth - 1)
    defs.push(...def)
    rels.push(...rel, `${node} --> ${callee}`)
  }
  
  for (const caller of known.getCallers(node)) {
    const { def, rel } = getRelative(known, caller, depth - 1)
    defs.push(...def)
    rels.push(...rel, `${caller} --> ${node}`)
  }

  return { def: new Set(defs), rel: new Set(rels) }
}
