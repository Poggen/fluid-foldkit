import { modifyFields } from 'foldkit/struct'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Render } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { chartRows } from '../cartesian/data-boundary'
import type { ChartRowSchema } from '../cartesian/data-boundary'
import type { LegendItemData } from './contexts'
import type { LegendViewInputs } from './options'
import { legendPresentation } from './options'
import { LegendMeasurement, legendRows, observeLegend } from './observation'
import { legendView } from './view'

const LegendNamespace = Block.makeNamespace('Legend')

const Message = defineMessageUnion({
  ObservedPointer: { index: Schema.NullOr(Schema.Int) },
  ObservedFocus: { index: Schema.NullOr(Schema.Int) },
  ObservedOwnFocus: { index: Schema.NullOr(Schema.Natural) },
  ObservedMeasurement: LegendMeasurement.fields,
  CompletedFocus: {},
})

const Observe = LegendNamespace.makeMountStream('ObserveLegend', {
  messages: [Message.ObservedMeasurement, Message.ObservedOwnFocus],
  *handler() {
    return ({ element, viewStateChanges }) =>
      observeLegend(element, viewStateChanges, Message.ObservedMeasurement, (index) =>
        Message.ObservedOwnFocus({ index }),
      )
  },
})

const FocusLegendItem = LegendNamespace.makeCommand('FocusLegendItem', {
  args: { id: Schema.String, index: Schema.NullOr(Schema.Int) },
  messages: [Message.CompletedFocus],
  *handler() {
    return ({ id, index }) =>
      Effect.gen(function* () {
        yield* Render.afterCommit
        yield* Effect.sync(() => {
          const root = id === '' ? null : document.querySelector(`#${CSS.escape(id)}`)

          if (root === null) {
            return
          }

          const HTMLElementClass = root.ownerDocument.defaultView?.HTMLElement

          if (HTMLElementClass === undefined) {
            return
          }

          if (index === null) {
            const active = root.ownerDocument.activeElement

            if (
              active instanceof HTMLElementClass &&
              active.closest('[data-bkm-legend-owner]') === root
            ) {
              active.blur()
            }
          } else {
            const row = legendRows(root).find(
              (item) =>
                item.attributes.getNamedItem('data-bkm-legend-index')?.value === String(index),
            )

            const target =
              row?.matches('button,[href],input,select,textarea,[tabindex]') === true
                ? row
                : row?.querySelector('button,[href],input,select,textarea,[tabindex]')

            if (target instanceof HTMLElementClass) {
              target.focus()
            }
          }
        })

        return Message.CompletedFocus()
      })
  },
})

/** Hover is deliberately absent: the chart parent is its only retained authority. */
export function defineLegendBlock<
  ItemSchema extends ChartRowSchema & { readonly Type: LegendItemData },
>(options: { readonly Item: ItemSchema }) {
  type Item = ItemSchema['Type']

  const Items = chartRows(options.Item)

  const Model = Schema.Struct({
    id: Schema.String,
    items: Items,
    focusedIndex: Schema.Option(Schema.Int),
    measurement: LegendMeasurement,
  })

  const InMessage = defineInMessageUnion({
    RequestedItems: { items: Items },
    RequestedHover: { index: Schema.NullOr(Schema.Int) },
    RequestedFocus: { index: Schema.NullOr(Schema.Int) },
  })

  const OutMessage = defineMessageUnion({
    HoverRequested: { index: Schema.NullOr(Schema.Int) },
    LayoutMeasured: LegendMeasurement.fields,
  })

  const effects = Block.makeEffectsContract()

  const contract = {
    Model,
    Message,
    InMessage,
    OutMessage,
    InitArgs: Schema.Tuple([Schema.String, Items]),
    view: { kind: 'Element', Inputs: Block.makeInputContract<LegendViewInputs<Item>>() } satisfies {
      readonly kind: 'Element'
      readonly Inputs: unknown
    },
    effects,
    inMessageOutputs: { RequestedHover: { outMessage: OutMessage.HoverRequested } },
  }

  const plans = <const Key extends symbol>(
    LegendDefinition: ReturnType<typeof Block.make<'Legend', Key, typeof contract>>,
  ) => {
    const LegendComposition = LegendDefinition.makeComposition({ mounts: [Observe] })
    const EffectsLayer = Layer.mergeAll(Observe.layer, FocusLegendItem.layer)

    return {
      init: LegendComposition.makeInit((id: string, items: ReadonlyArray<Item>) => ({
        model: {
          id,
          items,
          focusedIndex: Option.none<number>(),
          measurement: { width: 0, height: 0, rows: [] },
        },
      })),
      update: LegendComposition.makeUpdate({
        ObservedPointer: (model, { index }) => ({
          model,
          outMessage: OutMessage.HoverRequested({ index }),
        }),
        ObservedFocus: (model, { index }) => ({
          model: modifyFields(model, { focusedIndex: () => Option.fromNullishOr(index) }),
          outMessage: OutMessage.HoverRequested({ index }),
        }),
        ObservedOwnFocus: (model, { index }) => ({
          model:
            Option.getOrNull(model.focusedIndex) === index
              ? model
              : modifyFields(model, { focusedIndex: () => Option.fromNullishOr(index) }),
        }),
        ObservedMeasurement: (model, measurement) => {
          const before = model.measurement

          if (
            before.width === measurement.width &&
            before.height === measurement.height &&
            before.rows.length === measurement.rows.length &&
            before.rows.every((row, index) => {
              const next = measurement.rows[index]

              return (
                next !== undefined &&
                row.index === next.index &&
                row.x === next.x &&
                row.y === next.y &&
                row.width === next.width &&
                row.height === next.height
              )
            })
          ) {
            return { model }
          }

          const next = {
            width: measurement.width,
            height: measurement.height,
            rows: measurement.rows,
          }

          return {
            model: modifyFields(model, { measurement: () => next }),
            outMessage: OutMessage.LayoutMeasured(next),
          }
        },
        CompletedFocus: LegendDefinition.makeNoopStep(),
      }),
      inMessageUpdate: LegendComposition.makeInMessageUpdate({
        RequestedItems: (model, { items }) => {
          if (model.items === items) {
            return { model }
          }

          const current = Option.getOrNull(model.focusedIndex)

          return {
            model: modifyFields(model, {
              items: () => items,
              focusedIndex: () =>
                current !== null && current < items.length ? model.focusedIndex : Option.none(),
              measurement: () => ({ width: 0, height: 0, rows: [] }),
            }),
          }
        },
        RequestedFocus: (model, { index }) => {
          const target = index !== null && index >= 0 && index < model.items.length ? index : null

          return {
            model,
            commands: [FocusLegendItem({ id: model.id, index: target })],
          }
        },
        RequestedHover: (model, { index }) => ({
          model,
          outMessage: OutMessage.HoverRequested({ index }),
        }),
      }),
      view: LegendComposition.makeView.withInputs<LegendViewInputs<Item>>((model, inputs, h) =>
        legendView(
          h,
          model.id,
          model.items,
          inputs.hoveredIndex,
          legendPresentation(inputs),
          {
            pointer: (index) => Message.ObservedPointer({ index }),
            focus: (index) => Message.ObservedFocus({ index }),
          },
          [h.OnMount(Observe())],
        ),
      ),
      EffectsLayer,
    }
  }

  return { namespace: LegendNamespace, contract, plans }
}
