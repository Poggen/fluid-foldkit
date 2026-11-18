import * as classNames from './accordion-authored-block-classes.js'
import { Button } from '@foldkit/ui'
import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import type { DropdownResources } from '@foldkit-visuals/fluid/dropdown/environment'
import { SelectBlock, layer as selectLayer } from '@foldkit-visuals/fluid/select'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { Effect, Layer, Random, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineMessageUnion } from 'foldkit/message'
import type { Html } from 'foldkit/html'
import {
  AccordionBlock,
  AccordionGroupBlock,
  AccordionLayer,
  AccordionGroupLayer,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@foldkit-visuals/fluid/accordion'
import type { AccordionConfig, AccordionViewInputs } from '@foldkit-visuals/fluid/accordion'
import {
  SwitchBlock,
  SwitchLayer as switchLayer,
  createSwitchMotionScope,
} from '@foldkit-visuals/fluid/switch'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import {
  playgroundRows,
  standaloneRows,
  singleRows,
  multipleRows,
  highlightRows,
  expandChoices,
} from './accordion-authored-data.js'
import type { AccordionRow } from './accordion-authored-data.js'

const Expand = Schema.Literals(['one', 'oneOrNone', 'any'])

type Expand = typeof Expand.Type

const Message = defineMessageUnion({
  ClickedShuffle: {},
  CompletedShuffle: { expand: Expand, highlight: Schema.Boolean },
})

export const AccordionAuthoredKey = Symbol('AccordionAuthored')

const effects = Block.makeEffectsContract<never, DropdownResources>()

export const AccordionAuthoredBlock = Block.make('AccordionAuthored', {
  key: AccordionAuthoredKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({
    expand: Expand,
    isHighlight: Schema.Boolean,
    standalone: AccordionBlock.Model,
    single: AccordionGroupBlock.Model,
    multiple: AccordionGroupBlock.Model,
    rowHighlight: AccordionGroupBlock.Model,
    playground: Schema.Record(Schema.String, AccordionGroupBlock.Model),
    highlightSwitch: SwitchBlock.Model,
    expandSelect: SelectBlock.Model,
  }),
  Message,
  effects,
  view: { kind: 'Document' },
})

const indexed = (rows: ReadonlyArray<AccordionRow>) =>
  rows.map(({ value }, index) => ({ value, index }))

const Standalone = AccordionAuthoredBlock.makeRequiredFieldBinding(AccordionBlock, {
  field: 'standalone',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'authored-standalone',
        type: 'single',
        collapsible: true,
        defaultValue: 'item-1',
        items: standaloneRows.map(({ value }) => ({ value })),
      } satisfies AccordionConfig,
    ],
  },
}).withOutMessagePolicy({
  fold: AccordionAuthoredBlock.makeOutMessageFold(AccordionBlock, {
    ValueChanged: () => AccordionAuthoredBlock.makeNoopStep(),
  }),
})

const Single = AccordionAuthoredBlock.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'single',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'authored-single',
        type: 'single',
        collapsible: true,
        defaultValue: 'item-1',
        items: indexed(singleRows),
      } satisfies AccordionConfig,
    ],
  },
}).withOutMessagePolicy({
  fold: AccordionAuthoredBlock.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: () => AccordionAuthoredBlock.makeNoopStep(),
  }),
})

const Multiple = AccordionAuthoredBlock.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'multiple',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'authored-multiple',
        type: 'multiple',
        defaultValue: ['item-1', 'item-3'],
        items: indexed(multipleRows),
      } satisfies AccordionConfig,
    ],
  },
}).withOutMessagePolicy({
  fold: AccordionAuthoredBlock.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: () => AccordionAuthoredBlock.makeNoopStep(),
  }),
})

const RowHighlight = AccordionAuthoredBlock.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'rowHighlight',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'authored-row-highlight',
        type: 'single',
        collapsible: true,
        defaultValue: 'item-1',
        highlight: 'trigger',
        items: indexed(highlightRows),
      } satisfies AccordionConfig,
    ],
  },
}).withOutMessagePolicy({
  fold: AccordionAuthoredBlock.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: () => AccordionAuthoredBlock.makeNoopStep(),
  }),
})

const Playground = AccordionAuthoredBlock.makeRecordBinding(AccordionGroupBlock, {
  field: 'playground',
}).withOutMessagePolicy({
  fold: AccordionAuthoredBlock.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: () => AccordionAuthoredBlock.makeNoopStep(),
  }),
})

const HighlightInput = AccordionAuthoredBlock.makeRequiredFieldBinding(SwitchBlock, {
  field: 'highlightSwitch',
  init: { contextToArgs: () => [{ id: 'authored-highlight-expanded', checked: true }] },
})

const ExpandInput = AccordionAuthoredBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'expandSelect',
  init: {
    contextToArgs: () => [
      { ...exampleHoverConfig, id: 'authored-expand', items: expandChoices, value: 'oneOrNone' },
    ],
  },
})

const initPlayground = AccordionAuthoredBlock.makeStep((model) =>
  initAndInsert(Playground, model, {
    key: model.expand,
    args: [
      {
        ...exampleHoverConfig,
        id: `authored-playground-${model.expand}`,
        type: model.expand === 'any' ? 'multiple' : 'single',
        collapsible: model.expand === 'oneOrNone',
        defaultValue: model.expand === 'any' ? ['item-1'] : 'item-1',
        highlight: model.isHighlight ? 'item' : 'trigger',
        items: indexed(playgroundRows),
      },
    ],
  }),
)

const configure = ({ expand, highlight }: { expand: Expand; highlight: boolean }) =>
  AccordionAuthoredBlock.makeStep((model) =>
    Update.combineSteps([
      AccordionAuthoredBlock.makeFieldsStep(() => ({
        expand: () => expand,
        isHighlight: () => highlight,
      })),
      HighlightInput.requestConfigure({ checked: highlight, disabled: false }),
      ExpandInput.requestConfigure({ items: expandChoices, value: expand }),
      ...(model.expand === expand
        ? [
            Playground.informOfRoot(expand, {
              config: { highlight: highlight ? 'item' : 'trigger' },
            }),
          ]
        : [
            AccordionAuthoredBlock.makeFieldsStep(() => ({ playground: () => ({}) })),
            initPlayground,
          ]),
    ]),
  )

const Highlight = HighlightInput.withOutMessagePolicy({
  fold: AccordionAuthoredBlock.makeOutMessageFold(SwitchBlock, {
    Toggled: () =>
      AccordionAuthoredBlock.makeStep((model) =>
        configure({ expand: model.expand, highlight: !model.isHighlight }),
      ),
  }),
})

const ExpandControl = ExpandInput.withOutMessagePolicy({
  fold: AccordionAuthoredBlock.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) =>
      AccordionAuthoredBlock.makeStep((model) => {
        if (value === 'one' || value === 'oneOrNone' || value === 'any') {
          return configure({ expand: value, highlight: model.isHighlight })
        }

        return AccordionAuthoredBlock.makeNoopStep()
      }),
    OpenChanged: () => AccordionAuthoredBlock.makeNoopStep(),
  }),
})

const AccordionAuthoredComposition = AccordionAuthoredBlock.makeComposition({
  bindings: [Standalone, Single, Multiple, RowHighlight, Playground, Highlight, ExpandControl],
})

const Shuffle = AccordionAuthoredBlock.makeCommand('Shuffle', {
  messages: [Message.CompletedShuffle],
  *handler() {
    return () =>
      Effect.gen(function* shuffleOptions() {
        const selection = yield* Random.next
        const tint = yield* Random.next
        let expand: Expand = 'oneOrNone'

        if (selection < 0.25) {
          expand = 'one'
        } else if (selection >= 0.75) {
          expand = 'any'
        }

        return Message.CompletedShuffle({ expand, highlight: tint > 0.4 })
      })
  },
})

const init = AccordionAuthoredComposition.makeInit(() => ({
  model: { expand: 'oneOrNone', isHighlight: true, playground: {} },
  steps: [initPlayground],
}))

const update = AccordionAuthoredComposition.makeUpdate({
  ClickedShuffle: AccordionAuthoredBlock.makeCommandsStep(() => [Shuffle()]),
  CompletedShuffle: AccordionAuthoredBlock.makeStep.fromMessage(({ expand, highlight }) =>
    configure({ expand, highlight }),
  ),
})

export const motion = createMotionScope(classNames.accordionAuthored)

export const switchMotion = createSwitchMotionScope('accordion-authored-switch')

const animateHighlight = hoverHighlightAnimation(motion)

const presentation = createPresentationContext({
  icons: defaultIcons,
  size: 'default',
  shape: 'rounded',
  surface: 1,
  reducedMotion: 'user',
  ...examplePresentation,
})

const view = AccordionAuthoredComposition.makeView((model, h) => {
  const inputs: (rows: ReadonlyArray<AccordionRow>, grouped: boolean) => AccordionViewInputs = (
    rows: ReadonlyArray<AccordionRow>,
    grouped: boolean,
  ) => ({
    context: presentation,
    animate: motion.node,
    animateHighlight,
    content: (rootContext) =>
      rows.map((row, index) => {
        const props = {
          value: row.value,
          children: (context: typeof rootContext) => [
            AccordionTrigger({ value: row.value, children: [row.title] }, context, h),
            AccordionContent({ value: row.value, children: [row.content] }, context, h),
          ],
        }

        return AccordionItem(grouped ? { ...props, index } : props, rootContext, h)
      }),
  })

  const playground = model.playground[model.expand]

  if (playground === undefined) {
    throw new Error('Missing authored playground occurrence')
  }

  const preview = h.block(
    Playground.embedView({
      key: model.expand,
      slotId: model.expand,
      model: playground,
      viewInputs: inputs(playgroundRows, true),
    }),
  )

  const expandControl = h.block(
    ExpandControl.embedView({
      slotId: 'expand-control',
      model: model.expandSelect,
      viewInputs: {
        ariaLabel: 'Expand',
        variant: 'borderless',
        context: presentation,
        animate: motion.node,
        className: 'w-auto min-w-0 px-2',
        ...examplePresentation,
      },
    }),
  )

  const highlight = h.block(
    Highlight.embedView({
      slotId: 'highlight-control',
      model: model.highlightSwitch,
      viewInputs: {
        label: 'Highlight expanded',
        className: 'w-full flex-row-reverse justify-between',
        animate: switchMotion.node,
        context: presentation,
        ...examplePresentation,
      },
    }),
  )

  const standalone = h.block(
    Standalone.embedView({
      slotId: 'standalone',
      model: model.standalone,
      viewInputs: inputs(standaloneRows, false),
    }),
  )

  const single = h.block(
    Single.embedView({
      slotId: 'single',
      model: model.single,
      viewInputs: inputs(singleRows, true),
    }),
  )

  const multiple = h.block(
    Multiple.embedView({
      slotId: 'multiple',
      model: model.multiple,
      viewInputs: inputs(multipleRows, true),
    }),
  )

  const rowHighlight = h.block(
    RowHighlight.embedView({
      slotId: 'row-highlight',
      model: model.rowHighlight,
      viewInputs: inputs(highlightRows, true),
    }),
  )

  const section = (id: string, title: string, description: string, child: Html) =>
    h.section(
      [h.Id(id)],
      [
        h.h2([], [title]),
        h.p([h.Class(classNames.accordionDescription)], [description]),
        h.div([h.Class(classNames.accordionPreview)], [child]),
      ],
    )

  return {
    title: 'Accordion — authored examples',
    body: h.main(
      [h.Class(classNames.accordionAuthored)],
      [
        h.h1([], ['Accordion']),
        h.p(
          [h.Class(classNames.accordionDescription)],
          ['Collapsible sections with animated expand/collapse and fluid hover in grouped mode.'],
        ),
        h.section(
          [h.Id('playground')],
          [
            h.h2([], ['Playground']),
            h.div(
              [h.Class(classNames.accordionPlayground)],
              [
                h.div([h.Class(classNames.accordionPreview)], [preview]),
                h.div(
                  [h.Class(classNames.accordionControls)],
                  [
                    h.div(
                      [h.Class(classNames.accordionExpandControl)],
                      [h.span([], ['Expand']), expandControl],
                    ),
                    highlight,
                    Button.view(
                      {
                        onClick: Message.ClickedShuffle(),
                        type: 'button',
                        toView: (attributes) => h.button([...attributes.button], ['Shuffle']),
                      },
                      h,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        section(
          'standalone',
          'Standalone',
          'A single collapsible item with its own hover state.',
          h.div([h.Class('min-h-30 flex items-center')], [standalone]),
        ),
        section(
          'single',
          'Single Expand',
          'Multiple items with fluid hover — only one can be expanded at a time.',
          single,
        ),
        section(
          'multiple',
          'Multi Expand',
          'Multiple items with fluid hover — several can be expanded at once.',
          multiple,
        ),
        section(
          'row-highlight',
          'Row highlight',
          'With highlight="trigger" an expanded item holds no tint — the fill scopes to the row and waits for hover. Suits dense panels, where a block per open item reads as a second layer.',
          rowHighlight,
        ),
      ],
    ),
  }
})

export const layer = AccordionAuthoredBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: Shuffle.layer,
}).pipe(
  Layer.provide(Layer.mergeAll(AccordionLayer, AccordionGroupLayer, switchLayer, selectLayer)),
)
