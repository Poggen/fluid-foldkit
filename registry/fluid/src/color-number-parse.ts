export const parseColorNumber: (
  raw: string,
  locales: NumberLocales,
  percent: boolean,
) => number | null = function parseColorNumber(
  raw: string,
  locales: NumberLocales,
  percent: boolean,
) {
  let input = raw
    .replace(/\p{Cf}/gu, '')
    .trim()
    .replace(/[-−－‒–—﹣]/gu, '-')
    .replace(/[+＋﹢]/gu, '+')

  let negative = false

  const takeSign = (_match: string, sign: string) => {
    if (sign === '-') negative = true

    return ''
  }

  input = input.replace(/([+-])\s*$/, takeSign).replace(/^\s*([+-])/, takeSign)

  const details = /[٠-٩۰-۹]/.test(input)
    ? locales.ar
    : /[零〇一二三四五六七八九]/.test(input)
      ? locales.zh
      : locales.default

  let value = input

  if (details.group) {
    const grouping = /\p{Zs}/u.test(details.group)
      ? /\p{Zs}/gu
      : /['’]/.test(details.group)
        ? /['’]/g
        : new RegExp(escape(details.group), 'g')

    value = value.replace(grouping, '')
  }

  value = value
    .replace(new RegExp(escape(details.decimal), 'g'), '.')
    .replace(/[．٫]/g, '.')
    .replace(/[，٬]/g, '')

  if (details.currency) value = value.replace(new RegExp(escape(details.currency), 'g'), '')

  if (details.units.length)
    value = value.replace(new RegExp(details.units.map(escape).join('|'), 'g'), '')
  value = value.replace(/[%٪％﹪]/g, '').replace(/[‰؉]/g, '')

  if (details.exponentSeparator)
    value = value.replace(new RegExp(escape(details.exponentSeparator), 'g'), 'e')
  value = value
    .replace(/[٠-٩۰-۹０-９]/g, (char) => String(char.charCodeAt(0) % 16))
    .replace(/[零〇一二三四五六七八九]/g, (char) =>
      String(Math.max('零〇一二三四五六七八九'.indexOf(char) - 1, 0)),
    )
  const dot = value.lastIndexOf('.')

  if (dot !== -1) value = `${value.slice(0, dot).replace(/\./g, '')}.${value.slice(dot + 1)}`

  if (/^[-+]?Infinity$/i.test(input) || input.includes('∞')) return null
  let number = parseFloat((negative ? '-' : '') + value)
  const shift = /[‰؉]/.test(raw) ? -3 : !percent && /[%٪％﹪]/.test(raw) ? -2 : 0

  if (shift) {
    const [coefficient, exponent = '0'] = String(number).split('e')
    number = Number(`${coefficient}e${Number(exponent) + shift}`)
  }

  return Number.isFinite(number) ? number : null
}

export const roundColorNumber: (value: number, precision: number) => number =
  function roundColorNumber(value: number, precision: number) {
    if (!Number.isFinite(value)) return value
    const [coefficient = '0', exponent = '0'] = Math.abs(value).toString().split('e')
    const [integer = '0', fraction = ''] = coefficient.split('.')
    const digits = integer + fraction
    const position = integer.length + Number(exponent) + precision

    if (position < 0) return value < 0 ? -0 : 0
    const retained = digits.slice(0, position).padEnd(position, '0') || '0'
    const rounded = BigInt(retained) + ((digits[position] ?? '0') >= '5' ? 1n : 0n)

    return Number(`${value < 0 ? '-' : ''}${rounded}e-${precision}`)
  }

/* @license Transposed from Base UI number-field/utils/parse, MIT, MUI contributors. */
export interface NumberLocale {
  readonly decimal: string
  readonly group?: string | undefined
  readonly currency?: string
  readonly exponentSeparator?: string
  readonly units: ReadonlyArray<string>
}

export interface NumberLocales {
  readonly default: NumberLocale
  readonly ar: NumberLocale
  readonly zh: NumberLocale
}

export const isNumeral = (value: string) => /[0-9٠-٩۰-۹０-９零〇一二三四五六七八九]/.test(value)

export const minus = /[-−－‒–—﹣]/u

export const plus = /[+＋﹢]/u

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
