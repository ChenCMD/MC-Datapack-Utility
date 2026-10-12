// The extension is appended after validation, so the last component may be empty.
export function isRelativeResourceName(name: string): boolean {
  if (/[^a-z0-9./_-]/.test(name)) return false
  const parts = name.split('/')
  return parts.every((part, index) => part !== '.' && part !== '..' &&
    (part !== '' || index === parts.length - 1))
}
