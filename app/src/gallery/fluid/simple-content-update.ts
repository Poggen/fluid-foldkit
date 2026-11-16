import { Match, Option, Schema } from 'effect'
import { ColorPickerBlock, settingsOf, colorValueOf } from '@foldkit-visuals/fluid/color-picker'
import type { FluidConfiguration } from '../../playground/configuration'
import { FluidGalleryBlock } from './block'
import { Chat, Color } from './details-bindings'
import { Dialog } from './interactive-bindings'
const equal = Schema.toEquivalence(ColorPickerBlock.InMessage.RequestedConfigure.fields.settings)
export const reconcileSimpleContent = (
  configuration: Extract<
    FluidConfiguration,
    {
      readonly _tag:
        | 'badge'
        | 'chat-message'
        | 'dialog'
        | 'table'
        | 'thinking-indicator'
        | 'color-picker'
    }
  >,
) =>
  FluidGalleryBlock.makeStep((model) =>
    Match.value(configuration).pipe(
      Match.tag('badge', 'table', 'thinking-indicator', () => FluidGalleryBlock.makeNoopStep()),
      Match.tag('chat-message', (c) =>
        model.chat.from === c.from
          ? FluidGalleryBlock.makeNoopStep()
          : Chat.requestConfigure({
              from: c.from,
              files: model.chat.files,
              thumbnailSize: model.chat.thumbnailSize,
            }),
      ),
      Match.tag('dialog', (c) =>
        model.dialog.modal === c.modal
          ? FluidGalleryBlock.makeNoopStep()
          : Dialog.requestModal({ modal: c.modal }),
      ),
      Match.tag('color-picker', (c) => {
        const current = settingsOf(model.color)
        const swatches =
          c.swatchesPreset === 'none'
            ? []
            : c.swatchesPreset === 'warm'
              ? ['#ef4444', '#f97316', '#eab308']
              : c.swatchesPreset === 'cool'
                ? ['#06b6d4', '#3b82f6', '#8b5cf6']
                : ['#16a34a', '#3b82f6', '#8b5cf6', '#ec4899']
        const settings = {
          ...current,
          value:
            colorValueOf(model.color).toLowerCase() === c.value.toLowerCase()
              ? current.value
              : Option.some(c.value),
          format: Option.some(c.format),
          swatches,
          hideEyedropper: c.hideEyedropper,
        }
        return equal(current, settings)
          ? FluidGalleryBlock.makeNoopStep()
          : Color.requestConfigure({ settings })
      }),
      Match.exhaustive,
    ),
  )
