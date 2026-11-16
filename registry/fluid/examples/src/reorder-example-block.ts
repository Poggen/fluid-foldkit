import { Button } from '@foldkit/ui'
import { Boolean, Number } from 'effect'
import { Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  ReorderBlock,
  layer as ReorderLayer,
  createReorderScope,
  reorderItemAttributes,
} from '@foldkit-visuals/fluid/reorder'
import type { MotionOptions } from '@foldkit-visuals/fluid/motion'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'

const rowMotion = {
  initial: false,
  animate: {},
  layout: true,
  reducedMotion: 'user',
} satisfies MotionOptions

const initialIds = ['Research notes', 'Summary', 'Next steps']

const Model = Schema.Struct({
  reorder: ReorderBlock.Model,
  isMounted: Schema.Boolean,
  isShared: Schema.Boolean,
  selections: Schema.Natural,
  isHold: Schema.Boolean,
  maybePending: Schema.Option(Schema.Array(Schema.String)),
})

const Message = defineMessageUnion({
  ClickedReverse: {},
  ClickedMount: {},
  ClickedShared: {},
  ClickedHold: {},
  ClickedAccept: {},
  ClickedMove: { id: Schema.String, direction: Schema.Literals([-1, 1]) },
})

const key = Symbol('ReorderExample')

const effects = Block.makeEffectsContract()

export const ReorderExampleBlock = Block.make('ReorderExample', {
  key,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Element' },
  effects,
})

const Root = ReorderExampleBlock

const Reorder = Root.makeRequiredFieldBinding(ReorderBlock, {
  field: 'reorder',
  init: { contextToArgs: () => [{ id: 'reorder-rows', ids: initialIds }] },
})

const proposeOrder = (ids: ReadonlyArray<string>) =>
  Root.makeStep((model) =>
    Update.combineSteps([
      Root.makeFieldsStep(() => ({
        selections: Number.increment,
        maybePending: () => (model.isHold ? Option.some(ids) : Option.none()),
      })),
      model.isHold ? Root.makeNoopStep() : Reorder.requestConfigure({ ids }),
    ]),
  )

const ReorderPolicy = Reorder.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(ReorderBlock, {
    OrderRequested: ({ ids }) => proposeOrder(ids),
  }),
})

const composition = Root.makeComposition({ bindings: [ReorderPolicy] })

const init = composition.makeInit(() => ({
  model: {
    isMounted: true,
    isShared: true,
    selections: 0,
    isHold: false,
    maybePending: Option.none(),
  },
}))

const update = composition.makeUpdate({
  ClickedMove: Root.makeStep((model, { id, direction }) => {
    const ids = model.reorder.ids.slice()
    const index = ids.indexOf(id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ids.length) return { model }
    ids.splice(index, 1)
    ids.splice(target, 0, id)
    return proposeOrder(ids)
  }),
  ClickedHold: Root.makeFieldsStep(() => ({ isHold: Boolean.not })),
  ClickedAccept: Root.makeStep((model) =>
    Option.isSome(model.maybePending)
      ? Update.combineSteps([
          Reorder.requestConfigure({ ids: model.maybePending.value }),
          Root.makeFieldsStep(() => ({ maybePending: () => Option.none() })),
        ])
      : Root.makeNoopStep(),
  ),
  ClickedReverse: Root.makeStep((model) =>
    Reorder.requestConfigure({ ids: model.reorder.ids.toReversed() }),
  ),
  ClickedShared: Root.makeFieldsStep(() => ({ isShared: Boolean.not })),
  ClickedMount: Root.makeFieldsStep(() => ({ isMounted: Boolean.not })),
})

export const createReorderExampleLayer = () => {
  const motion = createMotionScope('reorder-example')
  const reorder = createReorderScope(motion)

  const view = composition.makeView((model, h) =>
    h.main(
      [h.Class('w-100 max-w-[calc(100vw-48px)] m-[48px_auto]')],
      [
        h.div(
          [h.Class('flex gap-4 mb-5 [&_button]:cursor-pointer')],
          [
            Button.view(
              {
                onClick: Message.ClickedReverse(),
                toView: (attributes) =>
                  h.button([...attributes.button, h.Id('reorder-reverse')], ['Reverse']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedMount(),
                toView: (attributes) =>
                  h.button([...attributes.button, h.Id('reorder-mount')], ['Mount / unmount']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedShared(),
                toView: (attributes) =>
                  h.button([...attributes.button, h.Id('reorder-shared')], ['Shared layout']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedHold(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button, h.Id('reorder-hold')],
                    [model.isHold ? 'Resume automatic acceptance' : 'Hold order proposals'],
                  ),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedAccept(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button, h.Id('reorder-accept')],
                    ['Accept pending order'],
                  ),
              },
              h,
            ),
          ],
        ),
        h.output([h.Id('reorder-count')], [String(model.selections)]),
        model.isMounted
          ? h.block(
              ReorderPolicy.embedView({
                slotId: 'queue',
                model: model.reorder,
                viewInputs: {
                  getReorder: () => reorder,
                  className: 'flex flex-col gap-2',
                  renderItem: (id, decorate) =>
                    decorate(
                      h.li(
                        [
                          h.Key(id),
                          h.DataAttribute('reorder-id', id),
                          ...reorderItemAttributes(),
                          h.Class('p-[16px] rounded-[8px] [background:var(--accent)] cursor-grab'),
                        ],
                        [
                          id,
                          ...([-1, 1] as const).map((direction) =>
                            Button.view(
                              {
                                onClick: Message.ClickedMove({ id, direction }),
                                type: 'button',
                                toView: (attributes) =>
                                  h.button(
                                    [
                                      ...attributes.button,
                                      h.AriaLabel(`Move ${id} ${direction === -1 ? 'up' : 'down'}`),
                                      h.Disabled(
                                        model.reorder.ids.indexOf(id) + direction < 0 ||
                                          model.reorder.ids.indexOf(id) + direction >=
                                            model.reorder.ids.length,
                                      ),
                                    ],
                                    [direction === -1 ? 'Move up' : 'Move down'],
                                  ),
                              },
                              h,
                            ),
                          ),
                        ],
                      ),
                      model.isShared ? { ...rowMotion, layoutId: id } : rowMotion,
                    ),
                },
              }),
            )
          : null,
      ],
    ),
  )

  return Root.makeLayer({ init, update, view }).pipe(
    Layer.provide(Layer.mergeAll(ReorderLayer, motion.layer, reorder.layer)),
  )
}
