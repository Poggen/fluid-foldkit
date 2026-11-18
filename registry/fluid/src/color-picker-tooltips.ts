import { Predicate } from 'effect'
import type { Html } from 'foldkit/html'
import type { ColorState, ColorSwatchItem } from './color-picker-state.js'
import { Channel } from './color-picker-state.js'
import type { TooltipViewInputs } from './tooltip-native/interaction.js'

export type ColorTooltipRenderer = (
  key: string,
  label: string,
  trigger: TooltipViewInputs['trigger'],
) => Html

export type ColorChannelTooltip = (request: {
  readonly key: string
  readonly content: string
  readonly render: TooltipViewInputs['trigger']
}) => Html

export function colorPickerChannelTooltipEntries(id: string) {
  return Channel.literals.map((channel) => ({
    key: `${id}-tooltip-${channel}`,
    options: { delayDuration: 300 },
  }))
}

export interface ColorPickerSwatch {
  readonly index: number
  readonly key: string
  readonly color: string
  readonly label: string | undefined
}

export const colorPickerSwatches: (
  id: string,
  swatches: ReadonlyArray<ColorSwatchItem>,
) => ReadonlyArray<ColorPickerSwatch> = (id: string, swatches: ReadonlyArray<ColorSwatchItem>) =>
  swatches.map((swatch, index) => ({
    index,
    key: `${id}-tooltip-swatch-${index}`,
    color: Predicate.isString(swatch) ? swatch : swatch.color,
    label: Predicate.isString(swatch) ? undefined : swatch.label,
  }))

export const isLabeledSwatch = (
  swatch: ColorPickerSwatch,
): swatch is ColorPickerSwatch & { readonly label: string } =>
  swatch.label !== undefined && swatch.label !== ''

export function colorTooltipEntries(state: ColorState) {
  return [
    ...(state.channelTooltipProvider === 'local' ? colorPickerChannelTooltipEntries(state.id) : []),
    ...colorPickerSwatches(state.id, state.settings.swatches)
      .filter(isLabeledSwatch)
      .map((swatch) => ({
        key: swatch.key,
        groupKey: `${state.id}-swatch-tooltips`,
        group: { delayDuration: 300 },
        options: { sideOffset: 2 },
      })),
  ]
}
