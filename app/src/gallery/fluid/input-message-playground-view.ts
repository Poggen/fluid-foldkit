import { createKeyedLazy, childAttributes } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import type { InputMessageViewInputs } from '@foldkit-visuals/fluid/input-message'
import type { DocumentTooltipOccurrenceViewInputs } from '@foldkit-visuals/fluid/tooltip'
import type { Configuration } from '../../playground/configs/input-message'
import type { ResolvedSettings } from '../../settings'
import { motion } from '../../motion'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Composer, Tooltips, reorder } from './interactive-bindings'
type InputMessageSlotContext = Parameters<NonNullable<InputMessageViewInputs['leftSlot']>>[0]
const render = (
  composer: FluidGalleryModel['composer'],
  tooltips: FluidGalleryModel['tooltips'],
  config: Configuration,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = createPresentationContext({
    shape,
    size,
    hoverMode: hover,
    hasShapeProvider: true,
    hasSizeProvider: true,
  })
  const triggers = new Map<string, DocumentTooltipOccurrenceViewInputs['trigger']>()
  return h.block(
    Tooltips.embedView({
      slotId: 'composer-tooltips',
      model: tooltips,
      viewInputs: {
        renderTrigger: (key, attributes) => {
          const trigger = triggers.get(key)
          if (trigger === undefined) return null
          return trigger(attributes)
        },
        renderDocument: (content, popups) => h.div([h.Class('contents')], [content, ...popups]),
        render: ({ tooltip }) =>
          h.block(
            Composer.embedView({
              slotId: 'composer',
              model: composer,
              viewInputs: {
                context,
                placeholder: config.placeholder,
                textareaLabel: 'Try the message composer',
                sendLabel: 'Send message',
                animate: motion.node,
                getReorder: () => reorder,
                tooltip: ({ trigger }, options) => {
                  triggers.set(options.key, trigger)
                  return tooltip(options.key, {
                    ...options,
                    animate: motion.node,
                    reducedMotion: 'user',
                  })
                },
                ...(config.leftSlot
                  ? {
                      leftSlot: ({ filePickerAttributes }: InputMessageSlotContext) => [
                        Button(
                          {
                            context,
                            variant: 'ghost',
                            buttonSize: 'sm',
                            attributes: [
                              ...filePickerAttributes(),
                              ...childAttributes([h.AriaLabel('Attach files')]),
                            ],
                            children: [defaultIcons.plus({ size: 16 }, h)],
                          },
                          h,
                        ),
                      ],
                    }
                  : {}),
                ...(config.rightSlot
                  ? {
                      rightSlot: () => [
                        Button(
                          {
                            context,
                            variant: 'ghost',
                            buttonSize: 'sm',
                            children: ['Sonnet 5'],
                            trailingIcon: defaultIcons['chevron-down'],
                          },
                          h,
                        ),
                      ],
                    }
                  : {}),
              },
            }),
          ),
      },
    }),
  )
}
export const makeInputMessagePlaygroundView = () => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    config: Configuration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    lazy('input-message-playground', render, [
      model.composer,
      model.tooltips,
      config,
      config.appearance.shape ?? settings.shape,
      config.appearance.size ?? settings.size,
      config.appearance.hover ?? settings.hover,
      h,
    ]) satisfies Html
}
