import { TooltipStoryLayer } from './tooltip-story-services.js'
import { it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Story } from 'foldkit'
import { expect, test } from 'vitest'
import { createColorNumberEnvironment, displayColorNumber } from '../src/color-number-locale.js'
import { parseColorNumber, roundColorNumber } from '../src/color-number-parse.js'
import {
  allowNumberKey,
  numberInputAllowedKeys,
  spliceNumberPaste,
  validNumberInput,
} from '../src/color-number-input.js'
import {
  ColorPickerBlock,
  layer as pickerLayer,
  createColorPickerLayer,
} from '../src/color-picker.js'

const environment = createColorNumberEnvironment()

test('source numeral, sign, punctuation, percent and parseFloat fallback corpus', () => {
  const corpus: ReadonlyArray<readonly [string, boolean, number | null]> = [
    ['１２．５', false, 12.5],
    ['١٢٫٥', false, 12.5],
    ['۱۲٫۵', false, 12.5],
    ['一二．五', false, 12.5],
    ['\u061C−12', false, -12],
    ['12−', false, -12],
    ['＋12', false, 12],
    ['1.2.3', false, 12.3],
    ['1,234', false, 1],
    ['12junk', false, 12],
    ['junk12', false, null],
    ['Infinity', false, null],
    ['∞', false, null],
    ['', false, null],
    ['1e309', false, null],
    ['50%', true, 50],
    ['50%', false, 0.5],
    ['50‰', true, 0.05],
  ]

  for (const [raw, percent, expected] of corpus) {
    expect(environment.parse(raw, percent)).toBe(expected)
  }

  const french = { ...environment.locales, default: { decimal: ',', units: [] } }
  expect(parseColorNumber('1 234,5', french, false)).toBe(1)
  expect(parseColorNumber('12,5', french, false)).toBe(12.5)
})

test('source formatter rounds before wrapper rounding', () => {
  expect(environment.round(-0.5, 0)).toBe(-1)
  expect(environment.round(1.005, 2)).toBe(1.01)
})

test('typed symbols and paste selection preserve source distinctions', () => {
  const keys = numberInputAllowedKeys(environment.locales.default, false)
  expect(validNumberInput('12junk', keys)).toBe(false)
  expect(validNumberInput('１２．５', keys)).toBe(true)
  expect(allowNumberKey('-', '-12', 0, 1, keys, '.')).toBe(true)
  expect(allowNumberKey('-', '-12', 3, 3, keys, '.')).toBe(false)
  expect(allowNumberKey('.', '1.2', 1, 2, keys, '.')).toBe(true)
  expect(spliceNumberPaste('123', '5', 3, 3)).toEqual({ value: '1235', caret: 4 })
})

it.effect(
  'Page keys and wrapped Home/End leave value unchanged; autofill commits outside edit mode',
  () =>
    Effect.gen(function* () {
      for (const key of ['PageUp', 'PageDown', 'Home', 'End']) {
        yield* Story.story(
          { block: ColorPickerBlock, layer: pickerLayer },
          Story.init({ id: 'number', defaultFormat: 'hsl' }),
          Story.models(
            Story.steps(
              Story.message(
                ColorPickerBlock.Message.FieldKey({ channel: 'hSL', key, shift: false }),
              ),
            ),
            (before, after) => expect(after.color.hsv).toEqual(before.color.hsv),
          ),
        )
      }
      yield* Story.story(
        { block: ColorPickerBlock, layer: pickerLayer },
        Story.init({ id: 'autofill', defaultFormat: 'rgb', defaultValue: '#000000' }),
        Story.message(ColorPickerBlock.Message.FieldAutofill({ channel: 'r', value: '255' })),
        Story.model((model) => expect(model.color.internalValue).toBe('rgb(255, 0, 0)')),
      )
    }).pipe(Effect.provide(Layer.merge(createColorPickerLayer(), TooltipStoryLayer))),
)

test('fixed fraction arithmetic matches captured source formatter over boundary and stepping corpus', () => {
  for (const precision of [0, 2]) {
    for (let tick = -7205; tick <= 7205; tick += 1) {
      const value = tick / 1000
      expect(roundColorNumber(value, precision)).toBe(environment.round(value, precision))
    }

    for (const value of [1.005, -0.5, 1e-7, -1e-7, 1e22, 1.0049999999999999]) {
      expect(roundColorNumber(value, precision)).toBe(environment.round(value, precision))
    }
  }
})

test('construction-captured locale display matches source fixed NumberFormat contracts', () => {
  for (const locale of ['en-US', 'fr-FR', 'de-DE', 'ar-EG', 'fa-IR', 'zh-CN', 'bn-BD', 'tr-TR']) {
    const localized = createColorNumberEnvironment(locale)

    for (const [value, percent, decimals] of [
      [50, true, 0],
      [107, false, 0],
      [0.12, false, 2],
    ] as const) {
      const numericOptions: Intl.NumberFormatOptions = {
        useGrouping: false,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }

      const formatter = new Intl.NumberFormat(
        locale,
        percent ? { ...numericOptions, style: 'unit', unit: 'percent' } : numericOptions,
      )

      expect(displayColorNumber(value.toFixed(decimals), percent, localized.display)).toBe(
        formatter.format(value),
      )
    }
  }
})

it.effect('wrapped hue rounds before wrapping and empty autofill preserves color', () =>
  Effect.gen(function* () {
    yield* Story.story(
      { block: ColorPickerBlock, layer: pickerLayer },
      Story.init({ id: 'round-wrap', defaultFormat: 'hsl' }),
      Story.message(ColorPickerBlock.Message.FieldFocus({ channel: 'hSL' })),
      Story.message(ColorPickerBlock.Message.FieldBlur({ channel: 'hSL', value: '-0.5' })),
      Story.model((model) => expect(model.color.hsv.h).toBe(359)),
    )
    yield* Story.story(
      { block: ColorPickerBlock, layer: pickerLayer },
      Story.init({ id: 'empty-autofill', defaultFormat: 'hsl' }),
      Story.models(
        Story.steps(
          Story.message(ColorPickerBlock.Message.FieldAutofill({ channel: 'hSL', value: '' })),
        ),
        (before, after) => expect(after.color.hsv).toEqual(before.color.hsv),
      ),
    )
    const keys = numberInputAllowedKeys(environment.locales.default, false, false)
    expect(allowNumberKey('-', '12', 0, 2, keys, '.')).toBe(false)
  }).pipe(Effect.provide(Layer.merge(createColorPickerLayer(), TooltipStoryLayer))),
)
