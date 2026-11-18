import { hoverModeOf as dotsHoverModeOf } from '@foldkit-visuals/fluid/carousel-dots'
import { hoverModeOf as tabsHoverModeOf } from '../../../components/docs/preview-controls'
import {
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
/* @license Derived from Fluid Functionalism cc276ca0's CarouselDots docs and slide-direction. MIT. */
import { Layer, Schema, Option } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { childAttributes } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  CarouselDotsBlock,
  CarouselDotsResourcesDefaultLayer,
  layer as CarouselLayer,
} from '@foldkit-visuals/fluid/carousel-dots'
import type { CarouselDotsConfig } from '@foldkit-visuals/fluid/carousel-dots'
import { spring } from '@foldkit-visuals/fluid/tokens'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { motion, target, highlight } from '../motion'
import { ComponentPresentation, presentation } from '../settings'
import source from './authored-carousel.ts?raw'
const labels = ['Inbox', 'Drafts', 'Sent', 'Archive']
const documentationTabsFor = (
  models: Readonly<Record<string, typeof PreviewControlsBlock.Model.Type>>,
  section: string,
) => {
  const child = models[section]
  if (child === undefined) throw new Error(`Missing documentation tabs ${section}`)
  return child
}
const key = Symbol('AuthoredCarousel')
export const AuthoredCarouselBlock = Block.make('AuthoredCarousel', {
  key,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    dots: Schema.Record(Schema.String, CarouselDotsBlock.Model),
    directions: Schema.Record(Schema.String, Schema.Finite),
    manual: Schema.Record(Schema.String, Schema.Boolean),
    isPaused: Schema.Boolean,
    documentationTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  Message: defineMessageUnion({
    Picked: { key: Schema.String },
    Hovered: { paused: Schema.Boolean },
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof CarouselDotsBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredCarouselBlock
const config: (key: string, value: number, paused: boolean) => CarouselDotsConfig = (
  key: string,
  value: number,
  paused: boolean,
) => ({
  id: `docs-carousel-${key}`,
  count: 4,
  value,
  autoplay: key === 'Autoplay' ? { duration: 3000, paused, loop: true } : false,
})
const RawDots = Root.makeRecordBinding(CarouselDotsBlock, { field: 'dots' })
const Dots = RawDots.withOutMessagePolicy({
  fold: (key) =>
    Root.makeOutMessageFold(CarouselDotsBlock, {
      ValueChanged: ({ value }) =>
        Root.makeStep((model) => {
          const child = model.dots[key]
          if (child === undefined) return { model }
          return Update.combineSteps([
            Root.makeFieldsStep(() => ({
              directions: () => ({
                ...model.directions,
                [key]: model.manual[key] ? (value > child.clock.value ? 1 : -1) : 1,
              }),
              manual: (manual) => ({ ...manual, [key]: false }),
            })),
            RawDots.requestConfigure(key, { config: config(key, value, model.isPaused) }),
          ])
        }),
    }),
})
const DocumentationTabs = Root.makeRecordBinding(PreviewControlsBlock, {
  field: 'documentationTabs',
})
const documentationTabsHover = (mode: 'fluid' | 'standard') =>
  Root.makeStep((model) =>
    Update.combineSteps(
      Object.entries(model.documentationTabs).flatMap(([section, child]) =>
        tabsHoverModeOf(child) === mode
          ? []
          : [DocumentationTabs.requestHoverMode(section, { mode: mode })],
      ),
    ),
  )
const initDocumentationTabs = Root.makeStep(() =>
  Update.combineSteps(
    ['Static', 'Autoplay'].map((section) =>
      Root.makeStep((model) =>
        initAndInsert(DocumentationTabs, model, {
          key: section,
          args: [
            {
              id: previewCodeTabId('carousel-dots', section),
              idPrefix: previewCodeTabId('carousel-dots', section),
              selectedIndex: 0,
            },
          ],
        }),
      ),
    ),
  ),
)
const Composition = Root.makeComposition({ bindings: [DocumentationTabs, Dots] })
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({
    model: {
      dots: {},
      directions: {},
      manual: {},
      isPaused: false,
      documentationTabs: {},
    },
    steps: [
      initDocumentationTabs,
      ...['Static', 'Autoplay'].map((key) =>
        Root.makeStep((model) =>
          initAndInsert(Dots, model, { key, args: [config(key, 0, false)] }),
        ),
      ),
    ],
  })),
  update: Composition.makeUpdate({
    Picked: Root.makeFieldsStep((model, { key }) => ({
      manual: (manual) => ({ ...manual, [key]: true }),
    })),
    Hovered: Root.makeStep((model, { paused }) =>
      Update.combineSteps([
        Root.makeFieldsStep(() => ({ isPaused: () => paused })),
        RawDots.requestConfigure('Autoplay', {
          config: config('Autoplay', model.dots.Autoplay?.clock.value ?? 0, paused),
        }),
      ]),
    ),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        documentationTabsHover(settings.hover),
        ...Object.entries(model.dots).flatMap(([key, child]) =>
          dotsHoverModeOf(child) === settings.hover
            ? []
            : [
                RawDots.requestConfigure(key, {
                  config: {
                    ...config(key, child.clock.value, model.isPaused),
                    hoverMode: settings.hover,
                  },
                }),
              ],
        ),
      ]),
    ),
  }),
  view: Composition.makeView.withInputs((model, { settings, ready }, h) => {
    if (!ready) return h.empty
    const context = presentation(settings)
    return h.div(
      [],
      ['Static', 'Autoplay'].flatMap((key) => {
        const child = model.dots[key]
        if (child === undefined) return []
        const direction = model.directions[key] ?? 1
        return [
          docSection(h, {
            title: key,
            description:
              key === 'Static'
                ? 'Hover a dot to see its click area, then click it. The highlight glides from dot to dot.'
                : 'Add autoplay and the pill fills, then the next slide comes in. Hover the slide to pause. Reduced motion turns the timer off.',
            source,
            presentation: { context },
            pane: model.documentationTabs[key]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
            tabsId: previewCodeTabId('carousel-dots', key),
            tabs: h.block(
              DocumentationTabs.embedView({
                key: key,
                slotId: previewCodeTabId('carousel-dots', key),
                model: documentationTabsFor(model.documentationTabs, key),
                viewInputs: previewCodeTabsViewInputs(h, {
                  context,
                  animate: target.node,
                  ariaLabel: `${key} example view`,
                }),
              }),
            ),
            children: [
              h.div(
                [h.Class('flex flex-col items-center gap-3')],
                [
                  h.div(
                    [
                      h.Class(
                        'relative grid size-40 place-items-center overflow-hidden border border-border/60 bg-background',
                      ),
                      h.Style({
                        borderRadius: `${resolvePresentation({ context }).shape.containerRadius}px`,
                      }),
                      ...(key === 'Autoplay'
                        ? [
                            h.OnMouseEnter(Root.Message.Hovered({ paused: true })),
                            h.OnMouseLeave(Root.Message.Hovered({ paused: false })),
                          ]
                        : []),
                    ],
                    labels.map((label, index) =>
                      motion.node(
                        h.keyed('span')(
                          `slide-${label}`,
                          [
                            h.Class('col-start-1 row-start-1 text-site-body text-foreground'),
                            h.AriaHidden(index !== child.clock.value),
                          ],
                          [label],
                        ),
                        {
                          initial: { opacity: 0, x: direction * 24 },
                          animate: { opacity: 1, x: 0 },
                          exit: {
                            opacity: 0,
                            x: -direction * 24,
                            transition: spring.moderate.exit,
                          },
                          transition: spring.moderate,
                          reducedMotion: 'user',
                          present: index === child.clock.value,
                        },
                      ),
                    ),
                  ),
                  h.block(
                    Dots.embedView({
                      key,
                      slotId: child.id,
                      model: child,
                      viewInputs: {
                        context,
                        animate: target.node,
                        animateHighlight: highlight,
                        getLabel: (index) => `Show ${labels[index] ?? ''}`,
                        attributes: childAttributes([
                          h.OnPointerDown(() => Option.some(Root.Message.Picked({ key }))),
                          h.OnKeyDown(() => Root.Message.Picked({ key })),
                        ]),
                      },
                    }),
                  ),
                ],
              ),
            ],
          }),
        ]
      }),
    )
  }),
}).pipe(
  Layer.provide(
    Layer.merge(PreviewControlsLayer, CarouselLayer).pipe(
      Layer.provide(CarouselDotsResourcesDefaultLayer),
    ),
  ),
)
