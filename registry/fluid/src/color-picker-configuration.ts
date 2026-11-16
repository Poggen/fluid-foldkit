import { Option, Predicate, Schema } from 'effect'
import { Update } from 'foldkit'
import { ColorSettings, colorConfigure, currentFormat } from './color-picker-state.js'
import type { InMessage } from './color-picker-block.js'
import {
  ColorPickerBlock,
  ColorPickerComposition,
  reconcileTooltips,
  ResolveSwatches,
  ResolveWhole,
  Menu,
  Swatches,
  selectFormat,
  Hue,
  Alpha,
} from './color-picker-block.js'
import { sliderSettings } from './slider.js'
import { railConfig } from './color-picker-rails.js'

const settingsEqual = Schema.toEquivalence(ColorSettings)
const swatchesEqual = Schema.toEquivalence(ColorSettings.fields.swatches)

export const inMessageUpdate = ColorPickerComposition.makeInMessageUpdate({
  RequestedHoverMode: ColorPickerBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Update.combineSteps([
        Swatches.requestConfigure({
          options: { mode, axis: 'xy', nearest: false, gapClick: true, maxDistance: Infinity },
        }),
        Menu.requestHoverMode({ mode }),
      ]),
  ),
  RequestedConfigure: ColorPickerBlock.makeStep(
    (model, { settings }: typeof InMessage.RequestedConfigure.Type) => {
      if (settingsEqual(model.color.settings, settings)) return { model }
      const swatchesChanged = !swatchesEqual(model.color.settings.swatches, settings.swatches)
      const state = colorConfigure(
        model.color,
        swatchesChanged ? settings : { ...settings, swatches: model.color.settings.swatches },
      )
      const formatChanged = currentFormat(state) !== currentFormat(model.color)
      const menuChanged =
        formatChanged ||
        Option.getOrNull(settings.formatOpen) !== Option.getOrNull(model.color.settings.formatOpen)

      // Controlled value echoes retain HSV; avoid restarting unrelated child work for each sample.
      return ColorPickerBlock.makeStep(() =>
        Update.combineSteps([
          ColorPickerBlock.makeFieldsStep(() => ({ color: () => state })),
          ...(state.hsv === model.color.hsv
            ? []
            : [
                Hue.requestSettings({
                  settings: sliderSettings({ id: `${state.id}-hue`, ...railConfig(state, 'hue') }),
                }),
                Alpha.requestSettings({
                  settings: sliderSettings({
                    id: `${state.id}-alpha`,
                    ...railConfig(state, 'alpha'),
                  }),
                }),
              ]),
          ...(menuChanged
            ? [
                Menu.requestSettings({
                  settings: { format: currentFormat(state), open: settings.formatOpen },
                }),
              ]
            : []),
          ...(swatchesChanged
            ? [
                reconcileTooltips(),
                ColorPickerBlock.makeCommandsStep(() => [
                  ResolveSwatches({
                    swatches: settings.swatches.map((swatch) =>
                      Predicate.isString(swatch) ? swatch : swatch.color,
                    ),
                  }),
                ]),
              ]
            : []),
        ]),
      )
    },
  ),
  RequestedColor: ColorPickerBlock.makeStep(
    (model, { value }: typeof InMessage.RequestedColor.Type) => ({
      model,
      commands: [ResolveWhole({ value })],
    }),
  ),
  RequestedFormat: ColorPickerBlock.makeStep(
    (model, { format }: typeof InMessage.RequestedFormat.Type) => selectFormat(model, format),
  ),
})
