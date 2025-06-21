
// TODO: TAG_PREFIX や PATH_SEPARATOR をソフトコーディング
const LOCATION_FORMAT = /^(#?)(?:([a-z0-9_\-.]*):)?([a-z0-9_\-./]*)$/

/** ResourceLocationらしき文字列について、そのnamespaceとpathを抽出する */
export function resolveResourceLocation(loc: string): ResourceLocation | undefined {
  if (loc === '') return { namespace: 'minecraft', path: [] }
  const match = loc.match(LOCATION_FORMAT)
  if (!match) return undefined
  const [, isTag, namespace, path] = match

  return { namespace: namespace ? namespace : 'minecraft', path: path ? path.split('/') : [], isTag: isTag !== '' }
}
