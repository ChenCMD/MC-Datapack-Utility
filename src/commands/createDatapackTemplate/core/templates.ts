// Templates contain JSON values and download callbacks. Copy JSON own keys without
// invoking prototype setters, while keeping callbacks callable by reference.
export const cloneTemplate = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(cloneTemplate) as T
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneTemplate(entry)])) as T
  }
  return value
}
