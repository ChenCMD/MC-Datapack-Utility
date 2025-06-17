
export function resolveResourceLocation(loc: string): ResourceLocation | undefined {
  if (loc === '') return { namespace: 'minecraft', path: [] }
  const match = loc.match(/^(?:([a-z0-9_\-.]*):)?([a-z0-9_\-./]*)$/)
  if (!match) return undefined
  const [, namespace, path] = match

  return { namespace: namespace ? namespace : 'minecraft', path: path ? path.split('/') : [] }
}
