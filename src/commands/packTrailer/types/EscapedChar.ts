export type EscapedChar = string & { readonly _brand: 'EscapedChar' }

/** `(&#[0-9]+)*` の形式に変換 */
export function makeEscapedChar(arg: string): EscapedChar {
  return [...Array(arg.length).keys()].map(i => `&#${arg.codePointAt(i)}`).join('') as EscapedChar
}

export function isEscapedChar(arg: string): arg is EscapedChar {
  return /^(&#\d+)*$/.test(arg)
}
