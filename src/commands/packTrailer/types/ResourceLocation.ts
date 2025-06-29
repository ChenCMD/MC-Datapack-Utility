
export type ResourceLocation = {
  isTag?: boolean
  namespace: string
  path: string[]
}

export function toString(rl: ResourceLocation): string {
  return `${rl.isTag ? '#' : ''}${rl.namespace}:${rl.path.join('/')}`
}
