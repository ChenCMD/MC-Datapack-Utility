import { createFileTypeResolver, FileType } from './fileTypes'

const { getFilePath } = createFileTypeResolver()

export function resourcePathFromRelative(relativePath: string, packFormat: number, fileType?: FileType): string {
  const fileTypePath = getFilePath(fileType, packFormat) ?? '[^/]+'
  return relativePath.replace(/\\/g, '/').replace(RegExp(`^data/([^/]+)/${fileTypePath}/(.*)\\.(?:mcfunction|json)$`), '$1:$2')
}

export function namespaceFromRelative(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/^data\/([^/]+)\/.*$/, '$1')
}
