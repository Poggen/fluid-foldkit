import { createKeyedLazy } from 'foldkit/html'
import type { DocumentTooltipViewInputs } from '@foldkit-visuals/fluid/tooltip'
import { demoPresentation } from './render-presentation'
import { Button } from '@foldkit-visuals/fluid/button'
import type { DocumentTooltipOccurrenceViewInputs } from '@foldkit-visuals/fluid/tooltip'
import type { Html } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import { motion, target } from '../../motion'
import { fluidPages, type ComponentPage } from '../../../../lib/catalogue'
import { previewCard, previewAdmitted } from '../card'
import type { FluidGalleryInputs, FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Composer, Copy, reorder, Tooltips } from './interactive-bindings'

type TooltipRender = Parameters<DocumentTooltipViewInputs['render']>[0]['tooltip']
type Decorate = (
  key: string,
  render: DocumentTooltipOccurrenceViewInputs['trigger'],
  content: string,
  shapeClass: string,
) => Html
const renderComposer = (
  model: FluidGalleryModel['composer'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  decorate: Decorate,
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Composer.embedView({
      slotId: 'composer',
      model: model,
      viewInputs: {
        context,

        textareaLabel: 'Try the message composer',
        placeholder: 'Ask me anything…',
        sendLabel: 'Send message',
        animate: motion.node,
        getReorder: () => reorder,
        tooltip: ({ trigger }, options) =>
          decorate('composer', trigger, options.content, options.shapeClass),
      },
    }),
  )
}
const renderCopy = (
  model: FluidGalleryModel['copy'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  decorate: Decorate,
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Copy.embedView({
      slotId: 'copy',
      model: model,
      viewInputs: {
        context,
        label: 'Copy',
        animate: target.node,

        tooltip: ({ trigger }, options) =>
          decorate('copy', trigger, options.content, options.shapeClass),
      },
    }),
  )
}
const renderTooltip = (shape: FluidGalleryInputs['settings']['shape'], tooltip: TooltipRender) =>
  tooltip('basic', {
    content: 'Copy to clipboard',
    shapeClass: shape === 'sharp' ? 'rounded-none' : 'rounded-lg',
    animate: motion.node,
    reducedMotion: 'user',
  })
type CardArguments<Model> = [
  model: Model,
  tooltips: FluidGalleryModel['tooltips'],
  page: ComponentPage,
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  admitted: boolean,
  standalone: boolean,
  h: FluidViewBuilder,
]
const renderCard = <Model>(
  body: (
    model: Model,
    shape: FluidGalleryInputs['settings']['shape'],
    size: FluidGalleryInputs['settings']['size'],
    hover: FluidGalleryInputs['settings']['hover'],
    decorate: Decorate,
    tooltip: TooltipRender,
    h: FluidViewBuilder,
  ) => Html,
  ...[model, tooltips, page, shape, size, hover, admitted, standalone, h]: CardArguments<Model>
) => {
  const settings = { shape, size, hover }
  const card = (content: Html) => previewCard(page, settings, content, h, !admitted, standalone)
  const context = demoPresentation(shape, size, hover)
  const triggers = new Map<string, DocumentTooltipOccurrenceViewInputs['trigger']>()
  return h.block(
    Tooltips.embedView({
      slotId: `${page.slug}-tooltips`,
      model: tooltips,
      viewInputs: {
        renderTrigger: (key, attributes) => {
          if (key === 'basic')
            return Button(
              {
                context,
                children: ['Hover me'],
                buttonSize: 'sm',
                variant: 'secondary',
                render: (attrs, children) =>
                  attributes.button(
                    attrs.flatMap((attribute) =>
                      '__childAttribute' in attribute ? [attribute] : childAttributes([attribute]),
                    ),
                    children,
                  ),
              },
              h,
            )
          const render = triggers.get(key)
          if (render === undefined) throw new Error(`Missing preview tooltip ${key}`)
          return render(attributes)
        },
        renderDocument: (content, popups) => h.div([h.Class('contents')], [content, ...popups]),
        render: ({ tooltip }) => {
          if (!admitted) return card(h.empty)
          const decorate: Decorate = (key, render, content, shapeClass) => {
            triggers.set(key, render)
            return tooltip(key, {
              content,
              shapeClass,
              animate: motion.node,
              reducedMotion: 'user',
            })
          }
          return card(body(model, shape, size, hover, decorate, tooltip, h))
        },
      },
    }),
  )
}
const composerCard = (...args: CardArguments<FluidGalleryModel['composer']>) =>
  renderCard(
    (model, shape, size, hover, decorate, _tooltip, h) =>
      renderComposer(model, shape, size, hover, decorate, h),
    ...args,
  )
const copyCard = (...args: CardArguments<FluidGalleryModel['copy']>) =>
  renderCard(
    (model, shape, size, hover, decorate, _tooltip, h) =>
      renderCopy(model, shape, size, hover, decorate, h),
    ...args,
  )
const tooltipCard = (...args: CardArguments<undefined>) =>
  renderCard(
    (_model, shape, _size, _hover, _decorate, tooltip) => renderTooltip(shape, tooltip),
    ...args,
  )
export const makeInteractiveTooltipDemos = () => {
  const lazy = createKeyedLazy()
  return (model: FluidGalleryModel, inputs: FluidGalleryInputs, h: FluidViewBuilder) => {
    const cards: Record<string, () => Html> = {}
    for (const page of fluidPages) {
      if (page.slug !== 'input-message' && page.slug !== 'input-copy' && page.slug !== 'tooltip')
        continue
      const args = [
        model.tooltips,
        page,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        previewAdmitted(page, inputs),
        inputs.only !== undefined,
        h,
      ] satisfies Parameters<typeof composerCard> extends [unknown, ...infer Rest] ? Rest : never
      if (page.slug === 'input-message')
        cards[page.slug] = () => lazy(page.slug, composerCard, [model.composer, ...args])
      else if (page.slug === 'input-copy')
        cards[page.slug] = () => lazy(page.slug, copyCard, [model.copy, ...args])
      else if (page.slug === 'tooltip')
        cards[page.slug] = () => lazy(page.slug, tooltipCard, [undefined, ...args])
    }
    return cards
  }
}
