import { Button } from '@foldkit-visuals/fluid/button'
import { childAttributes, createKeyedLazy } from 'foldkit/html'
import type { DocumentTooltipOccurrenceViewInputs } from '@foldkit-visuals/fluid/tooltip'
import type { Configuration as CopyConfiguration } from '../../playground/configs/input-copy'
import type { Configuration as TooltipConfiguration } from '../../playground/configs/tooltip'
import type { ResolvedSettings } from '../../settings'
import { motion, target } from '../../motion'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Copy, Tooltips } from './interactive-bindings'
import { configuredContext } from './configuration-presentation'
const render = (
  copy: FluidGalleryModel['copy'],
  tooltips: FluidGalleryModel['tooltips'],
  c: CopyConfiguration | TooltipConfiguration,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext(
    { shape, size, hover },
    c.appearance,
    c._tag === 'input-copy' ? c.size : undefined,
  )
  let trigger: DocumentTooltipOccurrenceViewInputs['trigger'] | undefined
  return h.block(
    Tooltips.embedView({
      slotId: 'playground-tooltips',
      model: tooltips,
      viewInputs: {
        renderTrigger: (key, attributes) =>
          c._tag === 'tooltip'
            ? Button(
                {
                  context,
                  variant: 'secondary',
                  children: [
                    key === 'basic' ? c.triggerLabel : key === 'tooltip-neighbor' ? 'Next' : 'Last',
                  ],
                  render: (attrs, children) =>
                    attributes.button(
                      attrs.flatMap((a) => ('__childAttribute' in a ? [a] : childAttributes([a]))),
                      children,
                    ),
                },
                h,
              )
            : (trigger?.(attributes) ?? null),
        renderDocument: (content, popups) => h.div([h.Class('contents')], [content, ...popups]),
        render: ({ tooltip }) =>
          c._tag === 'tooltip'
            ? h.div(
                [h.Class('flex items-center gap-2')],
                (c.presentation === 'morph'
                  ? ['basic', 'tooltip-neighbor', 'tooltip-third']
                  : ['basic']
                ).map((key) =>
                  tooltip(key, {
                    content:
                      key === 'basic'
                        ? c.label
                        : key === 'tooltip-neighbor'
                          ? 'A longer detail on the next item'
                          : 'One more detail',
                    shortcut: c.shortcut,
                    shapeClass: shape === 'sharp' ? 'rounded-none' : 'rounded-lg',
                    animate: motion.node,
                    reducedMotion: 'user',
                  }),
                ),
              )
            : h.block(
                Copy.embedView({
                  slotId: 'copy',
                  model: copy,
                  viewInputs: {
                    context,
                    label: c.label,
                    animate: target.node,
                    tooltip: ({ trigger: render }, options) => {
                      trigger = render
                      return tooltip('copy', {
                        ...options,
                        animate: motion.node,
                        reducedMotion: 'user',
                      })
                    },
                  },
                }),
              ),
      },
    }),
  )
}
export const makeSimpleTooltipView = () => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    c: CopyConfiguration | TooltipConfiguration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    lazy(c._tag, render, [
      model.copy,
      model.tooltips,
      c,
      settings.shape,
      settings.size,
      settings.hover,
      h,
    ])
}
