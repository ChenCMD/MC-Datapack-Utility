/**
 * @license
 * MIT License
 *
 * Copyright (c) 2019-2020 SPGoding
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import dateFormat from 'dateformat'
import { codeConsole } from '../extension'
import { Locale } from '../types/Locale'
import enLocale from './en.json'

const locales: {
  [key: string]: Locale
} = {
  '': enLocale,
  en: enLocale
}

let language = ''

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const locale = (key: string, ...params: any[]): string => {
  const value: string | undefined = locales[language][key] ?? locales.en[key]

  return resolveLocalePlaceholders(value, params) ?? (codeConsole.appendLine(`Unknown locale key “${key}”`), '')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveLocalePlaceholders(val: string | undefined, params?: any[]): string | undefined {
  return val?.replace(/%\d+%/g, match => {
    const index = parseInt(match.slice(1, -1))
    return params?.[index] !== undefined ? params[index].toString() : match
  })
}

const setupLanguage = async (code: string) => {
  locales[code] = await import(`./${code}.json`)
  language = code
  setupDateLocate()
  codeConsole.appendLine(`loading ${code}`)
}

export const loadLocale = async (setting: string, defaultLocaleCode: string): Promise<void> => {
  const specifiedLanguage = setting.toLowerCase() === 'default' ? defaultLocaleCode : setting
  if (language !== specifiedLanguage)
    await setupLanguage(specifiedLanguage)
}

const setupDateLocate = () => {
  const dayNames = [
    locale('day-name-abridge.sun'),
    locale('day-name-abridge.mon'),
    locale('day-name-abridge.tue'),
    locale('day-name-abridge.wed'),
    locale('day-name-abridge.thu'),
    locale('day-name-abridge.fri'),
    locale('day-name-abridge.sat'),
    locale('day-name.sunday'),
    locale('day-name.monday'),
    locale('day-name.tuesday'),
    locale('day-name.wednesday'),
    locale('day-name.thursday'),
    locale('day-name.friday'),
    locale('day-name.saturday')
  ]
  const monthNames = [
    locale('month-name-abridge.jan'),
    locale('month-name-abridge.feb'),
    locale('month-name-abridge.mar'),
    locale('month-name-abridge.apr'),
    locale('month-name-abridge.may'),
    locale('month-name-abridge.jun'),
    locale('month-name-abridge.jul'),
    locale('month-name-abridge.aug'),
    locale('month-name-abridge.sep'),
    locale('month-name-abridge.oct'),
    locale('month-name-abridge.nov'),
    locale('month-name-abridge.dec'),
    locale('month-name.january'),
    locale('month-name.february'),
    locale('month-name.march'),
    locale('month-name.april'),
    locale('month-name.may'),
    locale('month-name.june'),
    locale('month-name.july'),
    locale('month-name.august'),
    locale('month-name.september'),
    locale('month-name.october'),
    locale('month-name.november'),
    locale('month-name.december')
  ]
  const timeNames = [
    locale('time-name-abridge.ante-meridiem'),
    locale('time-name-abridge.post-meridiem'),
    locale('time-name.ante-meridiem'),
    locale('time-name.post-meridiem')
  ]
  dateFormat.i18n = {
    dayNames,
    monthNames,
    timeNames: [...timeNames, ...timeNames.map(v => v.toUpperCase())]
  }
}

/**
 * Convert an array to human-readable message.
 * @param arr An array.
 * @param quoted Whether or not to quote the result. Defaults to `true`
 * @param conjunction The conjunction to use. Defaults to `and`.
 * @returns Human-readable message.
 * @example // Using English
 * arrayToMessage([]) // "nothing"
 * arrayToMessage('foo') // "“foo”"
 * arrayToMessage(['foo']) // "“foo”"
 * arrayToMessage(['bar', 'foo']) // "“bar” and “foo”"
 * arrayToMessage(['bar', 'baz', 'foo']) // "“bar”, “baz”, and “foo”"
 * @example // Using Locale
 * arrayToMessage([], false) // "nothing"
 * arrayToMessage(['A'], false) // "A"
 * arrayToMessage(['A', 'B'], false) // "A{conjunction.and_2}B"
 * arrayToMessage(['A', 'B', 'C'], false) // "A{conjunction.and_3+_1}B{conjunction.and_3+_2}C"
 */
export const arrayToMessage = (arr: string | string[], quoted = true, conjunction: 'and' | 'or' = 'and'): string => {
  if (typeof arr === 'string')
    arr = [arr]
  const getPart = (str: string) => quoted ? locale('punc.quote', str) : str
  switch (arr.length) {
    case 0:
      return locale('nothing')
    case 1:
      return getPart(arr[0])
    case 2:
      return getPart(arr[0]) + locale(`conjunction.${conjunction}_2`) + getPart(arr[1])
    default:
      arr = arr.map(v => getPart(v))
      const forwardMes = arr.slice(0, -1).join(locale(`conjunction.${conjunction}_3+_1`))
      const backMes = arr[arr.length - 1]
      return forwardMes + locale(`conjunction.${conjunction}_3+_2`) + backMes
  }
}
