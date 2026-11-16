import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
import { NumberDisplay, latinNumberDisplay } from './color-number-locale.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Match, Option, Schema } from 'effect'
import { roundColorNumber } from './color-number-parse.js'
import {
  buildParsed,
  parseColor,
  rgbToHsv,
  rgbToHsl,
  rgbToOklch,
  hslToRgb,
  oklchToRgb,
  clamp01,
} from './color-picker-math.js'
import type { ParsedColor } from './color-picker-math.js'

export const ColorFormat = Schema.Literals(['hex', 'rgb', 'hsl', 'oklch'])

export type ColorFormat = typeof ColorFormat.Type

export const Channel = Schema.Literals([
  'hex',
  'r',
  'g',
  'b',
  'hSL',
  'sSL',
  'lSL',
  'L',
  'C',
  'H',
  'alphaPercent',
])

export type Channel = typeof Channel.Type

export const Hsv = Schema.Struct({
  h: Schema.Finite,
  s: Schema.Finite,
  v: Schema.Finite,
  a: Schema.Finite,
})

export const Parsed = Schema.Struct({
  ...Hsv.fields,
  r: Schema.Finite,
  g: Schema.Finite,
  b: Schema.Finite,
  hex: Schema.String,
  rgb: Schema.String,
  hsl: Schema.String,
  oklch: Schema.String,
})

export const ColorSwatchItem = Schema.Union([
  Schema.String,
  Schema.Struct({ color: Schema.String, label: Schema.optional(Schema.String) }),
])

export type ColorSwatchItem = typeof ColorSwatchItem.Type

export const ColorSettings = Schema.Struct({
  value: Schema.OptionFromNullOr(Schema.String),
  format: Schema.OptionFromNullOr(ColorFormat),
  formatOpen: Schema.OptionFromNullOr(Schema.Boolean),
  swatches: Schema.Array(ColorSwatchItem),
  hideEyedropper: Schema.Boolean,
})

export const ColorPickerConfigSchema = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  numberDisplay: Schema.optionalKey(NumberDisplay),
  channelTooltipProvider: Schema.optionalKey(Schema.Literals(['local', 'ancestor'])),
  value: Schema.optionalKey(Schema.String),
  defaultValue: Schema.optionalKey(Schema.String),
  format: Schema.optionalKey(ColorFormat),
  defaultFormat: Schema.optionalKey(ColorFormat),
  formatOpen: Schema.optionalKey(Schema.Boolean),
  defaultFormatOpen: Schema.optionalKey(Schema.Boolean),
  swatches: Schema.optionalKey(Schema.Array(ColorSwatchItem)),
  hideEyedropper: Schema.optionalKey(Schema.Boolean),
})

export type ColorPickerConfig = typeof ColorPickerConfigSchema.Type

export const ColorState = Schema.Struct({
  id: Schema.String,
  numberDisplay: NumberDisplay,
  channelTooltipProvider: Schema.Literals(['local', 'ancestor']),
  hsv: Hsv,
  settings: ColorSettings,
  internalValue: Schema.String,
  internalFormat: ColorFormat,
  oklchHue: Schema.OptionFromNullOr(Schema.Finite),
  lastEmitted: Schema.String,
  syncedValue: Schema.OptionFromNullOr(Schema.String),
  dragging: Schema.OptionFromNullOr(Schema.Int),
  squareHovered: Schema.Boolean,
  squareFocused: Schema.Boolean,
  cursor: Schema.OptionFromNullOr(Schema.Struct({ x: Schema.Finite, y: Schema.Finite })),
  editing: Schema.OptionFromNullOr(Channel),
  drafts: Schema.Record(Schema.String, Schema.String),
  scrubCursor: Schema.OptionFromNullOr(
    Schema.Struct({
      x: Schema.Finite,
      y: Schema.Finite,
      scale: Schema.Finite,
      visible: Schema.Boolean,
    }),
  ),
  scrub: Schema.OptionFromNullOr(
    Schema.Struct({
      channel: Channel,
      pointer: Schema.Int,
      start: Schema.Finite,
      value: Schema.Finite,
      movement: Schema.Finite,
      moved: Schema.Boolean,
    }),
  ),
  eyedropperSupported: Schema.Boolean,
  mounted: Schema.Boolean,
  resolvedSwatches: Schema.Record(Schema.String, Schema.String),
  pressed: Schema.Boolean,
})

export type ColorState = typeof ColorState.Type

export function colorSettings(config: ColorPickerConfig): typeof ColorSettings.Type {
  return {
    value: Option.fromNullishOr(config.value),
    format: Option.fromNullishOr(config.format),
    formatOpen: Option.fromNullishOr(config.formatOpen),
    swatches: config.swatches ?? [],
    hideEyedropper: config.hideEyedropper ?? false,
  }
}

export function colorInitial(config: ColorPickerConfig): ColorState {
  const raw = config.value ?? config.defaultValue ?? '#6B97FF'
  const parsed = parseColor(raw)

  const hsv = parsed
    ? { ...rgbToHsv(parsed.r, parsed.g, parsed.b), a: parsed.a }
    : { h: 0, s: 1, v: 1, a: 1 }

  return {
    id: config.id,
    channelTooltipProvider: config.channelTooltipProvider ?? 'local',
    numberDisplay: NumberDisplay.make(config.numberDisplay ?? latinNumberDisplay),
    hsv,
    settings: colorSettings(config),
    internalValue: raw,
    internalFormat: config.defaultFormat ?? 'hex',
    oklchHue: Option.none(),
    lastEmitted: '',
    syncedValue: Option.fromNullishOr(config.value),
    dragging: Option.none(),
    squareHovered: false,
    squareFocused: false,
    cursor: Option.none(),
    editing: Option.none(),
    drafts: {},
    scrub: Option.none(),
    scrubCursor: Option.none(),
    eyedropperSupported: false,
    mounted: false,
    resolvedSwatches: {},
    pressed: false,
  }
}

export function currentFormat(state: ColorState): ColorFormat {
  return Option.getOrElse(state.settings.format, () => state.internalFormat)
}

export function colorParsed(state: ColorState): ParsedColor {
  const { h, s, v, a } = state.hsv

  return buildParsed(h, s, v, a)
}

export function colorConfigure(state: ColorState, settings: typeof ColorSettings.Type): ColorState {
  const next = modifyFields(state, { settings: () => settings })

  if (
    Option.isNone(settings.value) ||
    Option.getOrNull(settings.value) === Option.getOrNull(state.syncedValue)
  ) {
    return next
  }

  const { value } = settings.value
  const parsed = value === state.lastEmitted ? null : parseColor(value)

  if (!parsed) {
    return modifyFields(next, { syncedValue: () => settings.value })
  }

  const hsv = rgbToHsv(parsed.r, parsed.g, parsed.b)

  return modifyFields(next, {
    syncedValue: () => settings.value,
    oklchHue: () => Option.none(),
    hsv: () => ({ h: hsv.s === 0 ? state.hsv.h : hsv.h, s: hsv.s, v: hsv.v, a: parsed.a }),
  })
}

export function colorEmit(state: ColorState, hsv: typeof Hsv.Type, format = currentFormat(state)) {
  const parsed = buildParsed(hsv.h, hsv.s, hsv.v, hsv.a)
  const value = parsed[format]

  return {
    state: modifyFields(state, {
      hsv: () => hsv,
      lastEmitted: () => value,
      internalValue: () => (Option.isNone(state.settings.value) ? value : state.internalValue),
    }),
    parsed,
    value,
  }
}

export function colorWhole(
  state: ColorState,
  color: {
    readonly r: number
    readonly g: number
    readonly b: number
    readonly a: number
  },
) {
  const hsv = rgbToHsv(color.r, color.g, color.b)

  return colorEmit(modifyFields(state, { oklchHue: () => Option.none() }), {
    ...hsv,
    h: hsv.s === 0 ? state.hsv.h : hsv.h,
    a: color.a,
  })
}

export function colorChannel(state: ColorState, channel: Exclude<Channel, 'hex'>, value: number) {
  const parsed = colorParsed(state)

  if (channel === 'alphaPercent') {
    return colorEmit(state, modifyFields(state.hsv, { a: () => clamp01(value / 100) }))
  }

  if (channel === 'r' || channel === 'g' || channel === 'b') {
    const rgb = { r: parsed.r, g: parsed.g, b: parsed.b, [channel]: value }
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)

    return colorEmit(
      modifyFields(state, { oklchHue: () => Option.none() }),
      modifyFields(state.hsv, {
        h: (h) => (hsv.s === 0 ? h : hsv.h),
        s: () => hsv.s,
        v: () => hsv.v,
      }),
    )
  }

  if (channel === 'hSL' || channel === 'sSL' || channel === 'lSL') {
    const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)
    const h = channel === 'hSL' ? value : hsl.h

    const rgb = hslToRgb(
      h,
      clamp01(channel === 'sSL' ? value / 100 : hsl.s),
      clamp01(channel === 'lSL' ? value / 100 : hsl.l),
    )

    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)

    return colorEmit(
      modifyFields(state, {
        oklchHue: (currentOklchHue) => (channel === 'hSL' ? Option.none() : currentOklchHue),
      }),
      modifyFields(state.hsv, {
        h: () => (hsv.s === 0 ? h : hsv.h),
        s: () => hsv.s,
        v: () => hsv.v,
      }),
    )
  }

  const oklch = rgbToOklch(parsed.r, parsed.g, parsed.b)
  const H = channel === 'H' ? value : Option.getOrElse(state.oklchHue, () => oklch.H)

  const rgb = oklchToRgb(
    clamp01(channel === 'L' ? value / 100 : oklch.L),
    Math.max(0, channel === 'C' ? value : oklch.C),
    H,
  )

  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)

  return colorEmit(
    modifyFields(state, { oklchHue: () => Option.some(H) }),
    modifyFields(state.hsv, {
      h: (h) => (hsv.s === 0 ? h : hsv.h),
      s: () => hsv.s,
      v: () => hsv.v,
    }),
  )
}

const channelSpec = (
  channel: Channel,
  label: string,
  value: string,
  max: number,
  wrap = false,
): ChannelSpec => ({
  channel,
  label,
  value,
  min: 0,
  max,
  step: 1,
  largeStep: 10,
  decimals: 0,
  wrap,
  percent: false,
  mode: 'numeric',
})

export function channelSpecs(state: ColorState) {
  const parsed = colorParsed(state)

  const alpha = {
    channel: 'alphaPercent',
    label: 'Alpha',
    value: `${Math.round(parsed.a * 100)}%`,
    min: 0,
    max: 100,
    step: 1,
    largeStep: 10,
    decimals: 0,
    wrap: false,
    percent: true,
    mode: 'numeric',
  } satisfies ChannelSpec

  return Match.value(currentFormat(state)).pipe(
    Match.when('hex', () => [
      channelSpec('hex', 'Hex value', parsed.hex.replace(/^#/u, '').toUpperCase(), 0),
      alpha,
    ]),
    Match.when('rgb', () => [
      channelSpec('r', 'Red', String(parsed.r), 255),
      channelSpec('g', 'Green', String(parsed.g), 255),
      channelSpec('b', 'Blue', String(parsed.b), 255),
      alpha,
    ]),
    Match.when('hsl', () => {
      const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b)

      return [
        channelSpec('hSL', 'Hue', String(Math.round(hsl.h)), 360, true),
        channelSpec('sSL', 'Saturation', String(Math.round(hsl.s * 100)), 100),
        channelSpec('lSL', 'Lightness', String(Math.round(hsl.l * 100)), 100),
        alpha,
      ]
    }),
    Match.when('oklch', () => {
      const oklch = rgbToOklch(parsed.r, parsed.g, parsed.b)

      return [
        {
          ...channelSpec('L', 'Lightness', (oklch.L * 100).toFixed(0), 100),
          mode: 'decimal',
        },
        {
          ...channelSpec('C', 'Chroma', oklch.C.toFixed(2), 0.4),
          step: 0.01,
          largeStep: 0.1,
          decimals: 2,
          mode: 'decimal',
        },
        channelSpec(
          'H',
          'Hue',
          Option.getOrElse(state.oklchHue, () => oklch.H).toFixed(0),
          360,
          true,
        ),
        alpha,
      ]
    }),
    Match.exhaustive,
  )
}

export interface ChannelSpec {
  readonly channel: Channel
  readonly label: string
  readonly value: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly largeStep: number
  readonly decimals: number
  readonly wrap: boolean
  readonly percent: boolean
  readonly mode: string
}

export function boundChannel(value: number, spec: ChannelSpec): number {
  const rounded = roundColorNumber(value, spec.decimals)

  const bounded =
    spec.wrap && (rounded < spec.min || rounded > spec.max)
      ? ((((rounded - spec.min) % (spec.max - spec.min)) + spec.max - spec.min) %
          (spec.max - spec.min)) +
        spec.min
      : Math.max(spec.min, Math.min(spec.max, rounded))

  return Number(bounded.toFixed(spec.decimals))
}
