import { GraphDefinition } from './MermaidHelper'
import { ParserType } from './ParserType'

const callKinds : {
  [key in ParserType | `${ParserType}/${string}`]?: string
} = {
  'minecraft:function': 'rectangle',
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'minecraft:resource_location/storage': 'cylinder'
}

type CallKind = keyof typeof callKinds

export type CallNode = `${CallKind}$${string}`

function isCallKind(kind: string): kind is CallKind {
  return kind in callKinds
}

export function asMermaidNode(node: CallNode): GraphDefinition {
  const [kind, info] = node.split('$')
  if (isCallKind(kind))
    return `${node}@{ label: '${info}', shape: '${callKinds[kind]}' }`
  return `${node}@{ label: '${info}', shape: 'triangle' }`
}
