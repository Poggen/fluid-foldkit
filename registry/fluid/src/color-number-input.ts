import { isNumeral, minus, plus, type NumberLocale } from './color-number-parse.js'

export const numberInputAllowedKeys: (
  locale: NumberLocale,
  percent: boolean,
  negative?: boolean,
) => ReadonlyArray<string> = function (locale: NumberLocale, percent: boolean, negative = true) {
  return [
    '.',
    ',',
    '．',
    '，',
    '٫',
    '٬',
    locale.decimal,
    '+',
    '＋',
    '﹢',
    ...(negative ? ['-', '−', '－', '‒', '–', '—', '﹣'] : []),
    ...(percent ? ['%', '٪', '％', '﹪'] : []),
  ] satisfies ReadonlyArray<string>
}

export const validNumberInput: (value: string, allowed: ReadonlyArray<string>) => boolean =
  function validNumberInput(value: string, allowed: ReadonlyArray<string>) {
    if (value.trim() === '') {
      return true
    }

    return Array.from(value).every(
      (char) =>
        isNumeral(char) || minus.test(char) || allowed.includes(char) || /\p{Cf}/u.test(char),
    )
  }

export const allowNumberKey: (
  key: string,
  value: string,
  start: number | null,
  end: number | null,
  allowed: ReadonlyArray<string>,
  decimal: string,
) => boolean = function allowNumberKey(
  key: string,
  value: string,
  start: number | null,
  end: number | null,
  allowed: ReadonlyArray<string>,
  decimal: string,
) {
  const covers = (index: number) => start !== null && end !== null && index >= start && index < end
  const all = start === 0 && end === value.length

  if (minus.test(key) && !allowed.some((symbol) => minus.test(symbol))) {
    return false
  }

  if (minus.test(key) || plus.test(key)) {
    const existing = value.search(minus.test(key) ? /[-−－‒–—﹣]/u : /[+＋﹢]/u)

    return !(minus.test(value) || plus.test(value)) || all || covers(existing)
  }

  if (key === decimal) {
    return !value.includes(key) || all || covers(value.indexOf(key))
  }

  return isNumeral(key) || allowed.includes(key) || key.length > 1
}

export function spliceNumberPaste(
  value: string,
  text: string,
  start: number | null,
  end: number | null,
) {
  const from = start ?? 0

  return { value: value.slice(0, from) + text + value.slice(end ?? 0), caret: from + text.length }
}
