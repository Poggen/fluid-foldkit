import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion } from 'foldkit/message'
import { HoverMode } from './hover-observation.js'
import type { ChildAttribute, Html } from 'foldkit/html'
import { HoverBlock, layer as HoverLayer } from './hover.js'
import { HoverHighlightBlock, layer as HighlightLayer } from './hover-highlight.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import type { SizeVariant } from './lib/size.js'
import { tableClassName } from './table-parts.js'
import type { TableContext } from './table-parts.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { PresentationContext } from './presentation.js'

const Model = Schema.Struct({
  id: Schema.String,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
})

export const TableKey = Symbol('FluidTable')

const effects = Block.makeEffectsContract()
const InMessage = defineInMessageUnion({ RequestedHoverMode: { mode: HoverMode } })

export const TableBlock = Block.make('Table', {
  key: TableKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({ id: Schema.String, hoverMode: Schema.optionalKey(HoverMode) }),
  ]),
  Model,
  InMessage,
  Message: Schema.Never,
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<TableViewInputs>() },
})

export interface TableConfig {
  readonly id: string
  readonly hoverMode?: HoverMode
}

const Highlight = TableBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: TableConfig) => [
      { id: `${config.id}-highlight`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
})

const Hover = TableBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: TableConfig) => [
      { id: `${config.id}-hover`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
}).withOutMessagePolicy({
  fold: TableBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      TableBlock.makeStep((model) =>
        Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
      ),
  }),
})

const TableComposition = TableBlock.makeComposition({ bindings: [Hover, Highlight] })

const init = TableComposition.makeInit((config: TableConfig) => ({
  model: { id: config.id },
  childInitContext: config,
}))

const update = TableComposition.makeUpdate({})
const inMessageUpdate = TableComposition.makeInMessageUpdate({
  RequestedHoverMode: TableBlock.makeStep(
    (model, { mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Update.combineSteps([
        Hover.requestConfigure({
          options: { mode, axis: 'y', nearest: true, gapClick: true, maxDistance: Infinity },
        }),
        Highlight.informOfSource({ snapshot: model.hover, hidden: false, mode }),
      ]),
  ),
})

export interface TableViewInputs {
  readonly animateHighlight: HoverHighlightViewInputs['animate']
  readonly content: (context: TableContext) => ReadonlyArray<Html>
  readonly size?: SizeVariant
  readonly context?: PresentationContext
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const view = TableComposition.makeView.withInputs<TableViewInputs>((model, inputs, h) => {
  const size = resolvePresentation(inputs).size.variant
  const presentation = createPresentationContext({ ...inputs, size })

  return h.block(
    Hover.embedView({
      slotId: model.hover.id,
      model: model.hover,
      viewInputs: {
        className: 'relative',
        content: (context) => [
          h.block(
            Highlight.embedView({
              slotId: model.highlight.id,
              model: model.highlight,
              viewInputs: { animate: inputs.animateHighlight, mode: model.hover.mode },
            }),
          ),
          h.table(
            [
              h.Id(model.id),
              h.Class(tableClassName(size, inputs.className)),
              ...(inputs.attributes ?? []),
            ],
            inputs.content({ ...context, size, presentation }),
          ),
        ],
      },
    }),
  )
})

export const layer = TableBlock.makeLayer({ init, update, inMessageUpdate, view }).pipe(
  Layer.provide(Layer.merge(HoverLayer, HighlightLayer)),
)

export const hoverModeOf = (model: typeof TableBlock.Model.Type) => model.hover.mode
