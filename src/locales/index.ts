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

import dateFormat from 'dateformat';
import { codeConsole } from '../extension';
import enLocale from './en.json';

const locales: {
    [key: string]: Locale
} = {
    '': enLocale,
    en: enLocale
};

interface Locale {
    [key: string]: string
}

let language = '';

export function locale(key: string, ...params: string[]): string {
    const value: string | undefined = locales[language][key] ?? locales.en[key];

    return resolveLocalePlaceholders(value, params) ?? (codeConsole.appendLine(`Unknown locale key “${key}”`), '');
}

export function resolveLocalePlaceholders(val: string | undefined, params?: string[]): string | undefined {
    return val?.replace(/%\d+%/g, match => {
        const index = parseInt(match.slice(1, -1));
        return params?.[index] !== undefined ? params[index] : match;
    });
}

async function setupLanguage(code: string) {
    locales[code] = await import(`./${code}.json`);
    language = code;
    setupDateLocate();
    codeConsole.appendLine(`loading ${code}`);
}

export async function loadLocale(setting: string, defaultLocaleCode: string): Promise<void> {
    const specifiedLanguage = setting.toLowerCase() === 'default' ? defaultLocaleCode : setting;
    if (language !== specifiedLanguage)
        await setupLanguage(specifiedLanguage);
}

function setupDateLocate() {
    dateFormat.i18n = {
        dayNames: [...locale('dayNames').split(', '), ...locale('dayNamesAdridge')],
        monthNames: [...locale('monthNames').split(', '), ...locale('monthNamesAdridge').split(', ')],
        timeNames: locale('timeNames').split(', ')
    };
}