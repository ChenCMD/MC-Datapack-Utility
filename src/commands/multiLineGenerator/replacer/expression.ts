import { locale } from '../../../locales'
import { ParsingError } from '../../../types'
import { listenInput, numberValidator, stringValidator } from '../../../utils'
import { Replacer } from '../types/Replacer'

export const expressionReplacer: Replacer = async (insertString, insertCount) => {
  const expression = await listenInput(locale('expression.expression'), undefined, 'y = 2x + 1')
  const paddingLength = parseInt(await listenInput(locale('serial-number.padding-length'), v => numberValidator(v, { min: -1 }), -1), 10)
  const paddingChar = paddingLength >= 1
    ? await listenInput(locale('serial-number.padding-char'), v => stringValidator(v, { minLength: 1, maxLength: 1 }))
    : '0'

  const ans: string[] = []
  try {
    for (let i = 1; i < insertCount + 1; i++) {
      const replaceData: number = eval(expression
        .replace(/\s/g, '')
        .replace(/^.*=/, '')
        .replace(/\^/g, '**')
        .replace(/\dx/g, m => `${m.slice(0, 1)}*x`)
        .replace(/^[x0-9]\(/g, m => `${m.slice(0, 1)}*(`)
        .replace(/[0-9]\(/g, m => `${m.slice(0, 1)}*(`)
        .replace(/[^a-zA-Z.]x\(/g, m => `${m.slice(0, 2)}*(`)
        .replace(/[^a-zA-Z.]x/g, m => `${m.slice(0, 1)}${i.toString()}`))
      ans.push(replaceData.toString(10))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch {
    throw new ParsingError(locale('error.not-expression'))
  }

  const maxLength = ans.reduce((a, b) => Math.max(a, b.length), 0)

  return (paddingLength !== -1 ? ans.map(str => paddingChar.repeat(maxLength - str.length + paddingLength) + str) : ans)
    .map(v => insertString.replace(/%r/g, v))
}
