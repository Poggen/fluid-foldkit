/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Effect, Layer, Queue, Schema, Stream, Boolean } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html } from 'foldkit/html'
import { HoverBlock, HoverMode, layer as HoverLayer } from './hover.js'
import { HoverHighlightBlock, layer as HighlightLayer } from './hover-highlight.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import type { BreadcrumbContext } from './breadcrumb-parts.js'
import { BreadcrumbButton, BreadcrumbEllipsis } from './breadcrumb-parts.js'
import type { TargetMotionOptions } from './motion-target.js'
import { spring } from './lib/springs.js'

export {
  BreadcrumbButton,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from './breadcrumb-parts.js'

export type {
  BreadcrumbContext,
  BreadcrumbCrumbProps,
  BreadcrumbPartProps,
  BreadcrumbElementRenderer,
  BreadcrumbTriggerAttributes,
} from './breadcrumb-parts.js'

export const BreadcrumbCollapse = Schema.Literals(['never', 'overflow', 'always'])
export type BreadcrumbCollapse = typeof BreadcrumbCollapse.Type

const Config = Schema.Struct({
  id: Schema.String,
  hoverMode: Schema.optionalKey(HoverMode),
  count: Schema.optionalKey(Schema.Natural),
  expanded: Schema.optionalKey(Schema.Boolean),
  collapse: Schema.optionalKey(BreadcrumbCollapse),
})

export type BreadcrumbConfig = typeof Config.Type

const Model = Schema.Struct({
  id: Schema.String,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
  count: Schema.Natural,
  hiddenCount: Schema.Natural,
  expanded: Schema.Boolean,
  collapse: BreadcrumbCollapse,
  truncated: Schema.Array(Schema.String),
})

const Message = defineMessageUnion({
  Observed: { hiddenCount: Schema.Natural, truncated: Schema.Array(Schema.String) },
  Toggled: {},
})

const InMessage = defineInMessageUnion({
  RequestedExpanded: { expanded: Schema.Boolean },
  RequestedCount: { count: Schema.Natural },
  RequestedCollapse: { collapse: BreadcrumbCollapse },
  RequestedHoverMode: { mode: HoverMode },
})

const OutMessage = defineMessageUnion({
  ExpandedChanged: { expanded: Schema.Boolean },
  LayoutChanged: { hiddenCount: Schema.Natural },
})

export interface BreadcrumbViewInputs extends Presentation {
  readonly ariaLabel?: string
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly separator?: Html | string | null | undefined
  readonly tooltip?: BreadcrumbContext['tooltip']
  readonly content: (
    context: BreadcrumbContext & {
      readonly collapsed: boolean
      readonly hiddenCount: number
      readonly expanded: boolean
      readonly toggle: () => Html
    },
  ) => ReadonlyArray<Html>
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
}

const effects = Block.makeEffectsContract()

export const BreadcrumbKey = Symbol('Breadcrumb')

export const BreadcrumbBlock = Block.make('Breadcrumb', {
  key: BreadcrumbKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<BreadcrumbViewInputs>() },
  effects,
})

const hoverConfig: (config: BreadcrumbConfig) => readonly [
  {
    readonly id: string
    readonly axis: 'xy'
    readonly nearest: false
    readonly gapClick: false
    readonly mode: HoverMode
  },
] = (config: BreadcrumbConfig) => [
  {
    id: `${config.id}-hover`,
    axis: 'xy',
    nearest: false,
    gapClick: false,
    mode: config.hoverMode ?? 'fluid',
  },
]

const Highlight = BreadcrumbBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: BreadcrumbConfig) => [
      { id: `${config.id}-highlight`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
})

const Hover = BreadcrumbBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: { contextToArgs: hoverConfig },
}).withOutMessagePolicy({
  fold: BreadcrumbBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      BreadcrumbBlock.makeStep((model) =>
        Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
      ),
  }),
})

const isEllipsis = (item: HTMLElement) =>
  item.querySelector('[data-slot=breadcrumb-ellipsis]') !== null

const Observe = BreadcrumbBlock.makeMountStream('Observe', {
  args: { count: Schema.Natural },
  messages: [Message.Observed],
  *handler() {
    return ({ element, count, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Paused'
            ? Stream.never
            : Stream.callback<typeof Message.Observed.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    if (!(element instanceof HTMLElement)) {
                      throw new Error('Breadcrumb requires an HTML root')
                    }

                    const window = element.ownerDocument.defaultView

                    if (!window) {
                      throw new Error('Breadcrumb requires a document')
                    }

                    let previous = ''
                    const widths: Array<number> = []
                    let ellipsisWidth = 0

                    const read = () => {
                      const targets = [
                        ...element.querySelectorAll<HTMLElement>('[data-breadcrumb-target]'),
                      ]

                      for (const [index, target] of targets.entries()) {
                        if (target.dataset.fluidHoverItem !== String(index)) {
                          target.dataset.fluidHoverItem = String(index)
                        }
                      }

                      const truncated = targets.flatMap((target) => {
                        const label = target.querySelector<HTMLElement>(
                          '[data-slot=breadcrumb-label]',
                        )

                        return label !== null && label.scrollWidth > label.clientWidth + 0.5
                          ? [target.id]
                          : []
                      })

                      const items = [
                        ...element.querySelectorAll<HTMLElement>(
                          '[data-slot=breadcrumb-list] > [data-slot=breadcrumb-item]',
                        ),
                      ]

                      const ellipsis = items.find(isEllipsis)

                      if (ellipsis) {
                        ellipsisWidth = ellipsis.getBoundingClientRect().width
                      }

                      const priorHidden = Number(element.dataset.hiddenCount ?? 0)

                      for (const [index, item] of items
                        .filter((entry) => !isEllipsis(entry))
                        .entries()) {
                        const step = priorHidden > 0 && index > 0 ? index + priorHidden : index
                        let { width } = item.getBoundingClientRect()

                        if (item.querySelector('[data-slot=breadcrumb-page]')) {
                          for (const label of item.querySelectorAll<HTMLElement>(
                            '[data-slot=breadcrumb-label]',
                          )) {
                            width += label.scrollWidth - label.clientWidth
                          }
                        }

                        if (step < count) {
                          widths[step] = width
                        }
                      }

                      let hiddenCount = 0

                      if (
                        element.dataset.expanded !== 'true' &&
                        element.dataset.collapse === 'always'
                      ) {
                        hiddenCount = Math.max(0, count - 3)
                      } else if (
                        count > 0 &&
                        element.dataset.expanded !== 'true' &&
                        element.dataset.collapse !== 'never'
                      ) {
                        const total = widths.reduce((sum, width) => sum + width, 0)
                        const available = element.clientWidth

                        if (total > available + 0.5) {
                          let shown = total + (ellipsisWidth || 44)

                          while (hiddenCount < Math.max(0, count - 3) && shown > available + 0.5) {
                            shown -= widths[1 + hiddenCount] ?? 0
                            hiddenCount += 1
                          }
                        }
                      }

                      const observation = { hiddenCount, truncated }
                      const encoded = JSON.stringify(observation)

                      if (encoded !== previous) {
                        previous = encoded
                        Queue.offerUnsafe(queue, Message.Observed(observation))
                      }
                    }

                    const resize = new window.ResizeObserver(read)
                    resize.observe(element)
                    const mutation = new window.MutationObserver(read)
                    mutation.observe(element, {
                      childList: true,
                      subtree: true,
                      attributes: true,
                      attributeFilter: ['data-expanded', 'data-hidden-count', 'data-collapse'],
                    })
                    element.addEventListener('pointerover', read)
                    element.addEventListener('focusin', read)
                    read()

                    return () => {
                      resize.disconnect()
                      mutation.disconnect()
                      element.removeEventListener('pointerover', read)
                      element.removeEventListener('focusin', read)
                    }
                  }),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              ),
        ),
      )
  },
})

const BreadcrumbComposition = BreadcrumbBlock.makeComposition({
  bindings: [Hover, Highlight],
  mounts: [Observe],
})

const implementation = {
  init: BreadcrumbComposition.makeInit((config: BreadcrumbConfig) => ({
    childInitContext: config,
    model: {
      id: config.id,
      count: config.count ?? 0,
      hiddenCount:
        config.collapse === 'always' && !config.expanded ? Math.max(0, (config.count ?? 0) - 3) : 0,
      expanded: config.expanded ?? false,
      collapse: config.collapse ?? 'overflow',
      truncated: [],
    },
  })),
  update: BreadcrumbComposition.makeUpdate({
    Observed: (model, { hiddenCount: observedHiddenCount, truncated }) => {
      const hiddenCount =
        model.collapse === 'never' || model.expanded
          ? 0
          : model.collapse === 'always'
            ? Math.max(0, model.count - 3)
            : observedHiddenCount
      const next = {
        model: modifyFields(model, { hiddenCount: () => hiddenCount, truncated: () => truncated }),
      }

      return model.hiddenCount === hiddenCount
        ? next
        : { ...next, outMessage: OutMessage.LayoutChanged({ hiddenCount }) }
    },
    Toggled: (model) => ({
      model: modifyFields(model, {
        expanded: Boolean.not,
        hiddenCount: () =>
          model.expanded && model.collapse === 'always' ? Math.max(0, model.count - 3) : 0,
      }),
      outMessage: OutMessage.ExpandedChanged({ expanded: !model.expanded }),
    }),
  }),
  inMessageUpdate: BreadcrumbComposition.makeInMessageUpdate({
    RequestedExpanded: (model, { expanded }) => ({
      model:
        expanded === model.expanded
          ? model
          : modifyFields(model, {
              expanded: () => expanded,
              hiddenCount: () =>
                !expanded && model.collapse === 'always' ? Math.max(0, model.count - 3) : 0,
            }),
    }),
    RequestedCount: (model, { count }) => ({
      model:
        count === model.count
          ? model
          : modifyFields(model, {
              count: () => count,
              hiddenCount: () =>
                model.collapse === 'always' && !model.expanded ? Math.max(0, count - 3) : 0,
            }),
    }),
    RequestedCollapse: (model, { collapse }) => ({
      model:
        collapse === model.collapse
          ? model
          : modifyFields(model, {
              collapse: () => collapse,
              hiddenCount: () =>
                collapse === 'always' && !model.expanded ? Math.max(0, model.count - 3) : 0,
            }),
    }),
    RequestedHoverMode: BreadcrumbBlock.makeStep(
      (_model, { mode }: typeof InMessage.RequestedHoverMode.Type) =>
        Hover.requestConfigure({
          options: { mode, axis: 'xy', nearest: false, gapClick: false, maxDistance: Infinity },
        }),
    ),
  }),
  view: BreadcrumbComposition.makeView.withInputs((model, inputs, h) => {
    const { shape } = resolvePresentation(inputs)

    return h.nav(
      [
        h.Id(model.id),
        h.AriaLabel(inputs.ariaLabel ?? 'Breadcrumb'),
        h.DataAttribute('slot', 'breadcrumb'),
        h.Class(`relative min-w-0 w-full ${inputs.className ?? ''}`),
        h.DataAttribute('hidden-count', String(model.expanded ? 0 : model.hiddenCount)),
        h.DataAttribute('expanded', String(model.expanded)),
        h.DataAttribute('collapse', model.collapse),
        h.OnMount(Observe({ count: model.count })),
        ...(inputs.attributes ?? []),
      ],
      [
        h.block(
          Hover.embedView({
            slotId: model.hover.id,
            model: model.hover,
            viewInputs: {
              className: 'relative',
              content: () => [
                h.block(
                  Highlight.embedView({
                    slotId: model.highlight.id,
                    model: model.highlight,
                    viewInputs: {
                      className: shape.bg,
                      mode: model.hover.mode,
                      animate: (node, present, rect, reduce) =>
                        inputs.animate(node, {
                          initial: false,
                          animate: { ...rect, opacity: 1 },
                          exit: { opacity: 0 },
                          present,
                          transition: reduce ? { duration: 0 } : spring.moderate,
                        }),
                    },
                  }),
                ),
                ...inputs.content({
                  ...inputs,
                  truncated: model.truncated,
                  expanded: model.expanded,
                  hiddenCount: model.hiddenCount,
                  collapsed: !model.expanded && model.hiddenCount > 0,
                  toggle: () =>
                    BreadcrumbButton(
                      {
                        id: `${model.id}-expand`,
                        attributes: childAttributes([
                          h.AriaLabel(`Show ${model.hiddenCount} hidden steps`),
                          h.AriaExpanded(model.expanded),
                          h.OnClick(Message.Toggled()),
                        ]),
                        children: [BreadcrumbEllipsis(inputs, h)],
                      },
                      { ...inputs, truncated: model.truncated },
                      h,
                    ),
                }),
              ],
            },
          }),
        ),
      ],
    )
  }),
  EffectsLayer: Observe.layer,
}

export const layer = BreadcrumbBlock.makeLayer<typeof implementation>(implementation).pipe(
  Layer.provide(Layer.mergeAll(HoverLayer, HighlightLayer)),
)

export const hoverModeOf = (model: typeof BreadcrumbBlock.Model.Type) => model.hover.mode
