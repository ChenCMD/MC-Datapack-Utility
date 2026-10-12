// URI-relative paths use / on every host. Reject ambiguous Windows paths as well.
export const isTemplatePath = (relative: string, type: 'file' | 'folder'): boolean => {
  if (/[\\:]/.test(relative) || [...relative].some(char => {
    const code = char.charCodeAt(0)
    return code < 32 || (code >= 127 && code <= 159) || code === 0x2028 || code === 0x2029
  })) return false
  const path = type === 'folder' && relative.endsWith('/') ? relative.slice(0, -1) : relative
  return path.split('/').every(part => part.trim() !== '' && !/[ .]$/.test(part))
}
