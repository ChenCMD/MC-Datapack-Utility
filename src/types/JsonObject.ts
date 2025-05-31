export type JsonValue = string | number | boolean | JsonObject | JsonValue[] | null

export type JsonObject = { [key: string]: JsonValue }

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function isJsonObject(arg: any): arg is JsonObject {
  return typeof arg === 'object' && arg !== null
}
