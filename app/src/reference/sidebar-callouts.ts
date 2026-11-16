import { modifyFields } from 'foldkit/struct'
// Fluid Functionalism cc276ca0 FooterCalloutStack: same geometry, springs and tint ladder.
import { Effect, Layer, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  CardGroupBlock,
  layer as CardGroupLayer,
  Card,
  CardImage,
  CardMedia,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@foldkit-visuals/fluid/card'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { spring, shapeMap } from '@foldkit-visuals/fluid/tokens'
import { surfaceClasses, surfaceHoverClasses } from '@foldkit-visuals/fluid/tokens'
import { CARD_BANNER } from '../../../registry/fluid/examples/src/card-example-art'
import { ComponentPresentation } from '../settings'
import { resolvePresentation, type PresentationContext } from '@foldkit-visuals/fluid/presentation'
import { motion, highlight } from '../motion'
const cards = [
  {
    id: 'sidebar',
    icon: 'panel-left',
    title: 'Sidebar is here',
    desc: 'New in Fluid Functionalism',
  },
  { id: 'stars', icon: 'star', title: '500 stars', desc: 'Find the hidden mosaic' },
  { id: 'motion', icon: 'play', title: 'Motion guidelines', desc: 'Three spring tiers, one page' },
] as const
const key = Symbol('SidebarCallouts')
export const SidebarCalloutsBlock = Block.make('SidebarCallouts', {
  key,
  InitArgs: Schema.Tuple([Schema.Struct({ id: Schema.String, single: Schema.Boolean })]),
  ChildInitContext: Schema.Struct({ id: Schema.String, single: Schema.Boolean }),
  Model: Schema.Struct({
    id: Schema.String,
    isSingle: Schema.Boolean,
    groups: CardGroupBlock.Model,
    cards: Schema.Array(
      Schema.Struct({ id: Schema.String, isPresent: Schema.Boolean, isInitial: Schema.Boolean }),
    ),
    isHovered: Schema.Boolean,
    cardHeight: Schema.Finite,
    generation: Schema.Natural,
  }),
  Message: defineMessageUnion({
    Measured: { height: Schema.Finite },
    Hovered: { value: Schema.Boolean },
    Dismissed: { id: Schema.String },
    Exited: { id: Schema.String },
    CompletedWaitBeforeRestock: { generation: Schema.Natural },
  }),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof CardGroupBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly context: PresentationContext
      readonly settings: ComponentPresentation
      readonly banner: boolean
    }>(),
  },
})
const Root = SidebarCalloutsBlock
const Group = Root.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'groups',
  init: { contextToArgs: ({ id }) => [{ id: `${id}-group`, fluidHover: false }] },
})
const Measure = Root.makeMountStream('Measure', {
  messages: [Root.Message.Measured],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state !== 'Live'
            ? Stream.never
            : Stream.callback<typeof Root.Message.Measured.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    let target: HTMLElement | null = null,
                      previous = 0
                    const measure = () => {
                      const next = element.querySelector<HTMLElement>(
                        '[data-callout-front] [data-slot="card"]',
                      )
                      if (next !== target) {
                        if (target) resize.unobserve(target)
                        target = next
                        if (target) resize.observe(target)
                      }
                      const height = target?.offsetHeight ?? 0
                      if (height > 0 && height !== previous) {
                        previous = height
                        Queue.offerUnsafe(queue, Root.Message.Measured({ height }))
                      }
                    }
                    const resize = new ResizeObserver(measure),
                      changes = new MutationObserver(measure)
                    changes.observe(element, {
                      childList: true,
                      subtree: true,
                      attributes: true,
                      attributeFilter: ['data-callout-front'],
                    })
                    measure()
                    return () => {
                      resize.disconnect()
                      changes.disconnect()
                    }
                  }),
                  (release) => Effect.sync(release),
                ),
              ),
        ),
      )
  },
})
const Composition = Root.makeComposition({ bindings: [Group], mounts: [Measure] })
const WaitBeforeRestock = Root.makeCommand('WaitBeforeRestock', {
  args: { generation: Schema.Natural },
  messages: [Root.Message.CompletedWaitBeforeRestock],
  *handler() {
    return ({ generation }) =>
      Effect.sleep('1600 millis').pipe(
        Effect.as(Root.Message.CompletedWaitBeforeRestock({ generation })),
      )
  },
})
const slots = (single: boolean, initial: boolean) =>
  (single ? cards.slice(0, 1) : cards).map(({ id }) => ({
    id,
    isPresent: true,
    isInitial: initial,
  }))
const implementation = {
  init: Composition.makeInit((config) => ({
    childInitContext: config,
    model: {
      id: config.id,
      isSingle: config.single,
      cards: slots(config.single, false),
      isHovered: false,
      cardHeight: 0,
      generation: 0,
    },
  })),
  update: Composition.makeUpdate({
    Measured: Root.makeFieldsStep.fromMessage(({ height }) => ({ cardHeight: () => height })),
    Hovered: Root.makeFieldsStep.fromMessage(({ value }) => ({ isHovered: () => value })),
    Dismissed: (model, { id }) => {
      const next = model.cards.map((card) =>
          card.id === id ? { ...card, isPresent: false } : card,
        ),
        empty = !next.some((card) => card.isPresent),
        generation = model.generation + 1
      return {
        model: modifyFields(model, { cards: () => next, generation: () => generation }),
        commands: empty ? [WaitBeforeRestock({ generation })] : [],
      }
    },
    Exited: Root.makeFieldsStep.fromMessage(({ id }) => ({
      cards: (current) => current.filter((card) => card.id !== id || card.isPresent),
    })),
    CompletedWaitBeforeRestock: (model, { generation }) => ({
      model:
        generation === model.generation
          ? modifyFields(model, { cards: () => slots(model.isSingle, true) })
          : model,
    }),
  }),
  view: Composition.makeView.withInputs((model, { context, settings, banner }, h) => {
    const surface = resolvePresentation({ context }).surface,
      level = Math.min(surface + 1, 8),
      live = model.cards.filter((card) => card.isPresent),
      cardH = model.cardHeight > 0 ? model.cardHeight : banner ? 180 : 64,
      expanded = !banner && model.isHovered && !model.isSingle
    const count = live.length,
      height =
        count === 0
          ? 0
          : expanded
            ? count * cardH + Math.max(0, count - 1) * 4
            : cardH + Math.min(Math.max(0, count - 1), 2) * 12
    return motion.node(
      h.div(
        [
          h.Class('relative'),
          h.OnMount(Measure()),
          h.OnMouseEnter(Root.Message.Hovered({ value: true })),
          h.OnMouseLeave(Root.Message.Hovered({ value: false })),
        ],
        [
          h.block(
            Group.embedView({
              slotId: `${model.id}-group`,
              model: model.groups,
              viewInputs: {
                context,
                orientation: banner ? 'card' : 'inline',
                count: model.cards.length,
                className: 'block',
                animateHighlight: highlight,
                children: (group) =>
                  model.cards.map((slot, index) => {
                    const spec = cards.find((card) => card.id === slot.id) ?? cards[0],
                      order = slot.isPresent
                        ? live.findIndex((card) => card.id === slot.id)
                        : index,
                      peek = Math.min(order, 2),
                      step = cards.findIndex((card) => card.id === slot.id)
                    const title = model.isSingle ? 'Aurora 2 is here' : spec.title,
                      description = model.isSingle
                        ? banner
                          ? 'Longer context, faster agents'
                          : 'See what changed'
                        : spec.desc
                    const intensity = [1, 0.4, 0.66][step] ?? 0.4
                    const mesh = CARD_BANNER.replace(
                      /(stop-opacity='|fill-opacity=')([0-9.]+)/g,
                      (_whole, prefix: string, opacity: string) =>
                        `${prefix}${Math.round(Number(opacity) * intensity * 1000) / 1000}`,
                    )
                    return motion.node(
                      h.div(
                        [
                          h.Key(slot.id),
                          ...(slot.isPresent && order === 0
                            ? [h.DataAttribute('callout-front', '')]
                            : []),
                          h.Class('absolute inset-x-0 bottom-0'),
                          h.Style({
                            transformOrigin: 'bottom center',
                            zIndex: String(100 - order),
                          }),
                        ],
                        [
                          Card(
                            {
                              context,
                              size: 'compact',
                              group,
                              label: `${title} — ${description}`,
                              dismissible: true,
                              onDismiss: Root.Message.Dismissed({ id: slot.id }),
                              href: '#callouts',
                              className: `${shapeMap[settings.shape].container} overflow-hidden transition-[background-color,box-shadow] duration-80 ${surfaceClasses(level, 2)} ${surfaceHoverClasses(level + 1, 3)} shadow-[var(--shadow-2-inset)] hover:shadow-[var(--shadow-3-inset)] min-h-0 ${banner ? '' : 'pl-2.5'}`,
                              ...(banner
                                ? {
                                    image: () =>
                                      CardImage(
                                        { src: mesh, className: 'aspect-[2/1] max-h-28' },
                                        h,
                                      ),
                                  }
                                : {}),
                              children: (card) => [
                                ...(banner
                                  ? []
                                  : [
                                      CardMedia(
                                        {
                                          ...card,
                                          icon: defaultIcons[model.isSingle ? 'brain' : spec.icon],
                                          size: 18,
                                          className: `${['bg-[#6B97FF]/25', 'bg-[#6B97FF]/[0.08]', 'bg-[#6B97FF]/15'][step]} [&_svg]:text-[#6B97FF]`,
                                        },
                                        h,
                                      ),
                                    ]),
                                CardHeader(
                                  {
                                    ...card,
                                    className: banner ? 'gap-0 pt-3' : 'gap-[2px] py-3',
                                    children: [
                                      CardTitle(
                                        { ...card, className: 'truncate', children: [title] },
                                        h,
                                      ),
                                      CardDescription(
                                        {
                                          ...card,
                                          className:
                                            'truncate text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]',
                                          children: [description],
                                        },
                                        h,
                                      ),
                                    ],
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                        ],
                      ),
                      {
                        initial: slot.isInitial ? { opacity: 0, y: 14, scale: 0.96 } : false,
                        animate: expanded
                          ? { y: -order * (cardH + 4), scale: 1, opacity: 1 }
                          : { y: -peek * 12, scale: 1 - peek * 0.05, opacity: order <= 2 ? 1 : 0 },
                        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.12 } },
                        present: slot.isPresent,
                        transition: spring.moderate,
                      },
                    )
                  }),
              },
            }),
          ),
        ],
      ),
      { initial: false, animate: { height }, transition: { ...spring.moderate, bounce: 0 } },
    )
  }),
  EffectsLayer: Layer.merge(WaitBeforeRestock.layer, Measure.layer),
}
export const layer = Root.makeLayer<typeof implementation>(implementation).pipe(
  Layer.provide(CardGroupLayer),
)
