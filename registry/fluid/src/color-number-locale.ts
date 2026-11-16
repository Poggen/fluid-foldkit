import { numberInputAllowedKeys } from './color-number-input.js'
import { Schema } from 'effect'
import type { NumberLocale, NumberLocales } from './color-number-parse.js'

export const NumberDisplay = Schema.Struct({
  decimal: Schema.NonEmptyString,
  digits: Schema.Array(Schema.NonEmptyString).check(Schema.isMinLength(10), Schema.isMaxLength(10)),
  percentPrefix: Schema.String,
  percentSuffix: Schema.String,
})

export type NumberDisplay = typeof NumberDisplay.Type

export const latinNumberDisplay: NumberDisplay = {
  decimal: '.',
  digits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  percentPrefix: '',
  percentSuffix: '%',
}

export function displayColorNumber(
  value: string,
  percent: boolean,
  display: NumberDisplay,
): string {
  const numeric = value
    .replace('%', '')
    .replace(/[0-9.]/g, (char) =>
      char === '.' ? display.decimal : (display.digits[Number(char)] ?? char),
    )

  return percent ? display.percentPrefix + numeric + display.percentSuffix : numeric
}

export interface ColorNumberEnvironment {
  readonly allowed: (percent: boolean, negative?: boolean) => ReadonlyArray<string>
  readonly display: NumberDisplay

  readonly locales: NumberLocales
  readonly parse: (raw: string, percent: boolean) => number | null
  readonly round: (value: number, decimals: number) => number
}

import { parseColorNumber } from './color-number-parse.js'

export function createColorNumberEnvironment(locale?: string): ColorNumberEnvironment {
  const details = (locale: string | undefined): NumberLocale => {
    const parts = new Intl.NumberFormat(locale, {
      useGrouping: false,
      maximumFractionDigits: 0,
    }).formatToParts(11111.1)

    return {
      decimal:
        new Intl.NumberFormat(locale).formatToParts(0.1).find((part) => part.type === 'decimal')
          ?.value ?? '.',
      group: parts.find((part) => part.type === 'group')?.value,
      units: [],
    }
  }

  const locales = { default: details(locale), ar: details('ar'), zh: details('zh') }
  const integer = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 0 })

  const decimal = new Intl.NumberFormat('en-US', {
    useGrouping: false,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const digitFormatter = new Intl.NumberFormat(locale, { useGrouping: false })

  const percentParts = new Intl.NumberFormat(locale, {
    useGrouping: false,
    style: 'unit',
    unit: 'percent',
    maximumFractionDigits: 0,
  }).formatToParts(50)

  const integerIndex = percentParts.findIndex((part) => part.type === 'integer')

  const display = {
    decimal: locales.default.decimal,
    digits: Array.from({ length: 10 }, (_, index) => digitFormatter.format(index)),
    percentPrefix: percentParts
      .slice(0, integerIndex)
      .map((part) => part.value)
      .join(''),
    percentSuffix: percentParts
      .slice(integerIndex + 1)
      .map((part) => part.value)
      .join(''),
  }

  return {
    display,
    allowed: (percent, negative = true) => [
      ...numberInputAllowedKeys(locales.default, percent, negative),
      ...(percent
        ? percentParts
            .filter((part) => part.type !== 'integer')
            .flatMap((part) => [
              ...Array.from(part.value),
              ...(/\p{Zs}/u.test(part.value) ? [' '] : []),
            ])
        : []),
    ],
    locales,
    parse: (raw, percent) => parseColorNumber(raw, locales, percent),
    round: (value, decimals) => Number((decimals === 2 ? decimal : integer).format(value)),
  }
}

export function createColorPickerNumberDisplay(locale?: string): NumberDisplay {
  return NumberDisplay.make(createColorNumberEnvironment(locale).display)
}
