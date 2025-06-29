import { resolveResourceLocation } from '../utils/resolve'
import { GraphDefinition } from './MermaidHelper'
import { ResourceLocation, toString } from './ResourceLocation'

const callKinds = {
  'function': 'rectangle',
  'storage': 'cylinder',
  'unknown': 'triangle'
}

type CallKind = keyof typeof callKinds

/**
 * `KIND$`以降の部分は ResourceLocation であることを期待する。
 */
export type CallNode = `${CallKind}$${string}`

function isCallKind(kind: string): kind is CallKind {
  return kind in callKinds
}

export function unfoldCallNode(node: CallNode): [CallKind, ResourceLocation] {
  const [kind, raw] = node.split('$')
  if (!isCallKind(kind))
    throw new Error(`Invalid call kind: ${kind}`)

  const rl = resolveResourceLocation(raw) // 毎回 resolve するのは無駄かも
  if (!rl) throw new Error(`Invalid resource location: ${raw}`)
  return [kind, rl]
}

export function asMermaidNode(node: CallNode): GraphDefinition {
  const [kind, rl] = unfoldCallNode(node)
  return `${node}@{ label: '${toString(rl)}', shape: '${callKinds[kind]}' }`
}
