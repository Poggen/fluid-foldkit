import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import { Layer, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { CardGroupRefs } from '@foldkit-visuals/fluid/card'
import {
  Card,
  CardGroupBlock,
  CardTitle,
  CardHeader,
  CardGroupRefsDefaultLayer,
  layer as CardLayer,
} from '@foldkit-visuals/fluid/card'
import type { CarouselDotsResources } from '@foldkit-visuals/fluid/carousel-dots'
import {
  CarouselDotsBlock,
  CarouselDotsResourcesDefaultLayer,
  layer as CarouselLayer,
} from '@foldkit-visuals/fluid/carousel-dots'
import { Button } from '@foldkit-visuals/fluid/button'
import { TableBlock, layer as TableLayer } from '@foldkit-visuals/fluid/table'
import {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@foldkit-visuals/fluid/table-parts'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import './table.css'

const Model = Schema.Struct({
  normal: TableBlock.Model,
  compact: TableBlock.Model,
  empty: TableBlock.Model,
  emptyCompact: TableBlock.Model,
  cards: CardGroupBlock.Model,
  slides: CarouselDotsBlock.Model,
  selected: Schema.NumberFromString,
})

const Message = defineMessageUnion({ Selected: { value: Schema.NumberFromString } })

const TableExampleKey = Symbol('FluidTableExample')

const effects = Block.makeEffectsContract<never, CardGroupRefs | CarouselDotsResources>()

const FluidTableExampleBlock = Block.make('FluidTableExample', {
  key: TableExampleKey,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Document' },
  Model,
  Message,
})

const Normal = FluidTableExampleBlock.makeRequiredFieldBinding(TableBlock, {
  field: 'normal',
  init: {
    contextToArgs: () => [{ ...exampleHoverConfig, id: 'normal-table', selectedIndices: [0, 1] }],
  },
})

const Compact = FluidTableExampleBlock.makeRequiredFieldBinding(TableBlock, {
  field: 'compact',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'compact-table' }] },
})

const Empty = FluidTableExampleBlock.makeRequiredFieldBinding(TableBlock, {
  field: 'empty',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'empty-table' }] },
})

const EmptyCompact = FluidTableExampleBlock.makeRequiredFieldBinding(TableBlock, {
  field: 'emptyCompact',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'empty-compact-table' }] },
})

const Cards = FluidTableExampleBlock.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'cards',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'companion-cards' }] },
})

const Slides = FluidTableExampleBlock.makeRequiredFieldBinding(CarouselDotsBlock, {
  field: 'slides',
  init: {
    contextToArgs: () => [{ ...exampleHoverConfig, id: 'companion-slides', count: 3, value: 0 }],
  },
})

const select = (value: number) =>
  Update.combineSteps([
    FluidTableExampleBlock.makeFieldsStep(() => ({ selected: () => value })),
    Slides.requestConfigure({ config: { id: 'companion-slides', count: 3, value } }),
  ])

const SlidesPolicy = Slides.withOutMessagePolicy({
  fold: FluidTableExampleBlock.makeOutMessageFold(CarouselDotsBlock, {
    ValueChanged: ({ value }) => select(value),
  }),
})

const FluidTableExampleComposition = FluidTableExampleBlock.makeComposition({
  bindings: [Normal, Compact, Empty, EmptyCompact, Cards, SlidesPolicy],
})

const init = FluidTableExampleComposition.makeInit(() => ({ model: { selected: 0 } }))

const update = FluidTableExampleComposition.makeUpdate({
  Selected: FluidTableExampleBlock.makeStep((_, { value }) => select(value)),
})

const motion = createTargetMotionScope('fluid-table-parity')

const view = FluidTableExampleComposition.makeView((model, h) => {
  const content: Parameters<typeof Normal.embedView>[0]['viewInputs']['content'] = (context) => [
    TableHeader(
      {
        context,
        children: [
          TableRow(
            {
              context,
              children: ['Name', 'Status', 'Region'].map((label, hoverIndex) =>
                TableHead({ context, hoverIndex, children: [label] }, h),
              ),
            },
            h,
          ),
        ],
      },
      h,
    ),
    TableBody(
      {
        children: ['Primary', 'Replica', 'Archive'].map((name, index) =>
          TableRow(
            {
              context,
              index,
              attributes: [h.Id(`${context.size}-row-${index}`)],
              children: [
                name,
                index === 2 ? 'Idle' : 'Active',
                index === 1 ? 'EU west' : 'US east',
              ].map((label) => TableCell({ size: context.size, children: [label] }, h)),
            },
            h,
          ),
        ),
      },
      h,
    ),
  ]

  const emptyContent: Parameters<typeof Empty.embedView>[0]['viewInputs']['content'] = (
    context,
  ) => [
    TableHeader(
      {
        children: [
          TableRow(
            {
              context,
              children: ['Name', 'Role', 'Status'].map((label) =>
                TableHead({ size: context.size, children: [label] }, h),
              ),
            },
            h,
          ),
        ],
      },
      h,
    ),
    TableBody(
      {
        children: [
          TableEmpty(
            {
              columns: 3,
              title: 'No members yet',
              description: 'People you invite show up here.',
              action: Button(
                {
                  ...examplePresentation,
                  variant: 'secondary',
                  buttonSize: 'compact',
                  children: ['Invite people'],
                },
                h,
              ),
            },
            h,
          ),
        ],
      },
      h,
    ),
  ]

  return {
    title: 'Fluid table parity',
    body: h.main(
      [h.Class('p-6 w-160 [&_h2]:text-[16px] [&_h2]:m-[24px_0_8px]')],
      [
        h.h1([], ['Fluid table parity']),
        h.h2([], ['Cards and carousel controls']),
        h.block(
          Cards.embedView({
            slotId: model.cards.id,
            model: model.cards,
            viewInputs: {
              count: 3,
              columns: 3,
              border: 'outlined',
              selectedIndex: model.selected,
              animateHighlight: hoverHighlightAnimation(motion),
              children: (group) =>
                ['Primary', 'Replica', 'Archive'].map((title, index) =>
                  Card(
                    {
                      group,
                      index,
                      selected: index === model.selected,
                      label: title,
                      onClick: Message.Selected({ value: index }),
                      children: (context) => [
                        CardHeader(
                          {
                            ...context,
                            children: [CardTitle({ ...context, children: [title] }, h)],
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ),
              ...examplePresentation,
            },
          }),
        ),
        h.block(
          SlidesPolicy.embedView({
            slotId: model.slides.id,
            model: model.slides,
            viewInputs: {
              animate: motion.node,
              animateHighlight: hoverHighlightAnimation(motion),
              ...examplePresentation,
            },
          }),
        ),
        h.h2([], ['Empty']),
        h.block(
          Empty.embedView({
            slotId: model.empty.id,
            model: model.empty,
            viewInputs: {
              content: emptyContent,
              animateHighlight: hoverHighlightAnimation(motion),
              ...examplePresentation,
            },
          }),
        ),
        h.h2([], ['Empty compact']),
        h.block(
          EmptyCompact.embedView({
            slotId: model.emptyCompact.id,
            model: model.emptyCompact,
            viewInputs: {
              content: emptyContent,
              size: 'compact',
              animateHighlight: hoverHighlightAnimation(motion),
              ...examplePresentation,
            },
          }),
        ),
        h.h2([], ['Default']),
        h.block(
          Normal.embedView({
            slotId: model.normal.id,
            model: model.normal,
            viewInputs: {
              content,
              animateHighlight: hoverHighlightAnimation(motion),
              ...examplePresentation,
            },
          }),
        ),
        h.h2([], ['Compact']),
        h.block(
          Compact.embedView({
            slotId: model.compact.id,
            model: model.compact,
            viewInputs: {
              content,
              size: 'compact',
              animateHighlight: hoverHighlightAnimation(motion),
              ...examplePresentation,
            },
          }),
        ),
      ],
    ),
  }
})

const layer = FluidTableExampleBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.mergeAll(TableLayer, CardLayer, CarouselLayer, motion.layer)),
)

Runtime.run(
  Program.make({
    block: FluidTableExampleBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide({
    services: Layer.merge(CardGroupRefsDefaultLayer, CarouselDotsResourcesDefaultLayer),
  }),
)
