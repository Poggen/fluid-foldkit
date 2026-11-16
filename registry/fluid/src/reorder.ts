import { cn } from './lib/utils.js'
import { modifyFields } from 'foldkit/struct'
import { Effect, Option, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { childAttributes, inertHtml } from 'foldkit/html'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { MotionOptions } from './motion.js'
import { REORDER_EVENT, REORDER_LIVE_EVENT } from './reorder-scope.js'
import type { ReorderScope } from './reorder-scope.js'
import type { ReorderAxis } from './reorder-order.js'

export { createReorderScope } from './reorder-scope.js'

export type { ReorderScope } from './reorder-scope.js'

export type { ReorderAxis } from './reorder-order.js'

const Ids = Schema.Array(Schema.String).check(
  Schema.makeFilter((ids: ReadonlyArray<string>) => new Set(ids).size === ids.length),
)

const Axis = Schema.Literals(['x', 'y'])

const Model = Schema.Struct({ id: Schema.String, ids: Ids, axis: Axis })

const Message = defineMessageUnion({
  ObservedOrder: { ids: Ids },
})

const OutMessage = defineMessageUnion({ OrderRequested: { ids: Ids } })

const Config = Schema.Struct({ id: Schema.String, ids: Ids, axis: Schema.optionalKey(Axis) })

export const InMessage = defineInMessageUnion({
  RequestedConfigure: { ids: Ids, axis: Schema.optionalKey(Axis) },
})

export const ReorderKey = Symbol('FluidReorder')

const effects = Block.makeEffectsContract()

export const ReorderBlock = Block.make('Reorder', {
  key: ReorderKey,
  InitArgs: Schema.Tuple([Config]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<ReorderViewInputs>() },
  effects,
})

const Observe = ReorderBlock.makeMountStream('Observe', {
  messages: [Message.ObservedOrder],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.ObservedOrder.Type>((queue) => {
                const listener = (event: Event) => {
                  if (!(event instanceof CustomEvent)) {
                    return
                  }

                  const parsed = Schema.decodeUnknownOption(Schema.Struct({ ids: Ids }))(
                    event.detail,
                  )

                  if (Option.isSome(parsed)) {
                    Queue.offerUnsafe(queue, Message.ObservedOrder(parsed.value))
                  }
                }

                return Effect.acquireRelease(
                  Effect.sync(() => {
                    element.addEventListener(REORDER_EVENT, listener)
                    element.dispatchEvent(new CustomEvent(REORDER_LIVE_EVENT, { detail: true }))

                    return () => {
                      element.dispatchEvent(new CustomEvent(REORDER_LIVE_EVENT, { detail: false }))
                      element.removeEventListener(REORDER_EVENT, listener)
                    }
                  }),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never))
              })
            : Stream.never,
        ),
      )
  },
})

const ReorderComposition = ReorderBlock.makeComposition({ mounts: [Observe] })

export interface ReorderConfig {
  readonly id: string
  readonly ids: ReadonlyArray<string>
  readonly axis?: ReorderAxis
}

const init = ReorderComposition.makeInit((config: ReorderConfig) => ({
  model: Model.make({ ...config, axis: config.axis ?? 'y' }),
}))

const update = ReorderComposition.makeUpdate({
  ObservedOrder: (model, { ids }) => {
    if (
      new Set(ids).size !== ids.length ||
      ids.length !== model.ids.length ||
      ids.some((id) => !model.ids.includes(id))
    ) {
      return { model }
    }

    return { model, outMessage: OutMessage.OrderRequested({ ids }) }
  },
})

export interface ReorderViewInputs {
  readonly getReorder: () => ReorderScope
  readonly renderIds?: ReadonlyArray<string>
  readonly renderItem: (id: string, decorate: (node: Html, options: MotionOptions) => Html) => Html
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const inMessageUpdate = ReorderComposition.makeInMessageUpdate({
  RequestedConfigure: (model, { ids, axis }) => ({
    model: modifyFields(model, { ids: () => ids, axis: (currentAxis) => axis ?? currentAxis }),
  }),
})

const view = ReorderComposition.makeView.withInputs((model, inputs, h) =>
  inputs.getReorder().group(
    h.ul(
      [
        h.Class(cn(inputs.className ?? '', '[overflow-anchor:none]')),
        h.Id(model.id),
        h.OnMount(Observe()),
        ...(inputs.attributes ?? []),
      ],
      (inputs.renderIds ?? model.ids).map((id) =>
        inputs.renderItem(id, (node, options) =>
          inputs.getReorder().item(node, id, options, model.axis),
        ),
      ),
    ),
    model.ids,
    model.axis,
  ),
)

export const layer = ReorderBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Observe.layer,
})

export function reorderItemAttributes(
  axis: ReorderAxis = 'y',
  style: Readonly<Record<string, string>> = {},
): ReadonlyArray<ChildAttribute> {
  const itemStyle = { ...style }
  // These drag constraints already took precedence over the caller's style before utility authoring.
  for (const property of [
    'zIndex',
    'z-index',
    'userSelect',
    'user-select',
    'WebkitUserSelect',
    '-webkit-user-select',
    'touchAction',
    'touch-action',
  ])
    delete itemStyle[property]

  return childAttributes([
    // Raw class attributes compose with the caller's checked Class in Foldkit's public renderer.
    inertHtml.Attribute(
      'class',
      '[-webkit-touch-callout:none] z-[unset] [user-select:none] [-webkit-user-select:none]',
    ),
    inertHtml.Attribute('draggable', 'false'),
    inertHtml.DataAttribute('fluid-reorder-item', ''),
    inertHtml.Style({ ...itemStyle, touchAction: axis === 'y' ? 'pan-x' : 'pan-y' }),
  ])
}
