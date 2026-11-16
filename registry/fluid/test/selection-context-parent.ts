import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { childAttributes } from 'foldkit/html'

import {
  CheckboxGroupBlock,
  CheckboxItem,
  layer as CheckboxLayer,
} from '@foldkit-visuals/fluid/checkbox-group'

import { RadioGroupBlock, RadioItem, layer as RadioLayer } from '@foldkit-visuals/fluid/radio-group'
import { Elevated } from '@foldkit-visuals/fluid/elevated'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'
import { ShapeProvider, useSizeContext } from '@foldkit-visuals/fluid/presentation/context'

export const SelectionContextParentKey = Symbol('SelectionContextParent')

const contextEffects = Block.makeEffectsContract()

const Root = Block.make('SelectionContextParent', {
  key: SelectionContextParentKey,
  Model: Schema.Struct({
    checks: CheckboxGroupBlock.Model,
    baseChecks: CheckboxGroupBlock.Model,
    radios: RadioGroupBlock.Model,
    baseRadios: RadioGroupBlock.Model,
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: contextEffects,
})

const Checks = Root.makeRequiredFieldBinding(CheckboxGroupBlock, {
  field: 'checks',
  init: {
    contextToArgs: () => [
      {
        id: 'radix-checkbox',
        checkedIndices: [0],
        items: [
          { index: 0, checked: true },
          { index: 1, checked: false },
        ],
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(CheckboxGroupBlock, { Toggled: Root.makeNoopStep }),
})

const BaseChecks = Root.makeRequiredFieldBinding(CheckboxGroupBlock, {
  field: 'baseChecks',
  init: {
    contextToArgs: () => [
      {
        id: 'base-checkbox',
        checkedIndices: [0],
        items: [
          { index: 0, checked: true },
          { index: 1, checked: false },
        ],
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(CheckboxGroupBlock, { Toggled: Root.makeNoopStep }),
})

const Radios = Root.makeRequiredFieldBinding(RadioGroupBlock, {
  field: 'radios',
  init: {
    contextToArgs: () => [
      {
        id: 'radix-radio',
        value: 'first',
        items: [
          { index: 0, value: 'first' },
          { index: 1, value: 'second' },
        ],
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(RadioGroupBlock, { Selected: Root.makeNoopStep }),
})

const BaseRadios = Root.makeRequiredFieldBinding(RadioGroupBlock, {
  field: 'baseRadios',
  init: {
    contextToArgs: () => [
      {
        id: 'base-radio',
        value: 'first',
        items: [
          { index: 0, value: 'first' },
          { index: 1, value: 'second' },
        ],
      },
    ],
  },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(RadioGroupBlock, { Selected: Root.makeNoopStep }),
})

const composition = Root.makeComposition({ bindings: [Checks, BaseChecks, Radios, BaseRadios] })

const createSelectionContextLayer = () => {
  const motion = createTargetMotionScope('selection-context-parent')
  const animateHighlight = hoverHighlightAnimation(motion)
  const animateSelection = selectionBackgroundAnimation(motion)

  const view = composition.makeView((model, h) =>
    ShapeProvider({
      defaultShape: 'pill',
      children: (presentation) =>
        h.main(
          [],
          [
            h.block(
              Checks.embedView({
                slotId: model.checks.id,
                model: model.checks,
                viewInputs: {
                  context: presentation,
                  size: 'compact',
                  animate: motion.node,
                  animateHighlight,
                  animateSelection,
                  className: 'root-radix-checkbox',
                  attributes: childAttributes([
                    h.Id('radix-checkbox'),
                    h.DataAttribute('root-owner', 'radix-checkbox'),
                  ]),
                  content: (context) => [
                    h.span([
                      h.DataAttribute('group-presentation', 'radix-checkbox'),
                      h.DataAttribute(
                        'size-provider',
                        useSizeContext(context.context, (size) => size).size,
                      ),
                    ]),
                    CheckboxItem({ label: 'radix-checkbox direct', index: 0 }, context, h),
                    Elevated(
                      {
                        ...context,
                        offset: 1,
                        children: () => [
                          CheckboxItem({ label: 'radix-checkbox wrapped', index: 1 }, context, h),
                        ],
                      },
                      h,
                    ),
                  ],
                },
              }),
            ),
            h.block(
              BaseChecks.embedView({
                slotId: model.baseChecks.id,
                model: model.baseChecks,
                viewInputs: {
                  context: presentation,
                  size: 'compact',
                  animate: motion.node,
                  animateHighlight,
                  animateSelection,
                  className: 'root-base-checkbox',
                  attributes: childAttributes([
                    h.Id('base-checkbox'),
                    h.DataAttribute('root-owner', 'base-checkbox'),
                  ]),
                  content: (context) => [
                    h.span([
                      h.DataAttribute('group-presentation', 'base-checkbox'),
                      h.DataAttribute(
                        'size-provider',
                        useSizeContext(context.context, (size) => size).size,
                      ),
                    ]),
                    CheckboxItem({ label: 'base-checkbox direct', index: 0 }, context, h),
                    Elevated(
                      {
                        ...context,
                        offset: 1,
                        children: () => [
                          CheckboxItem({ label: 'base-checkbox wrapped', index: 1 }, context, h),
                        ],
                      },
                      h,
                    ),
                  ],
                },
              }),
            ),
            h.block(
              Radios.embedView({
                slotId: model.radios.id,
                model: model.radios,
                viewInputs: {
                  context: presentation,
                  size: 'compact',
                  animate: motion.node,
                  animateHighlight,
                  className: 'root-radix-radio',
                  attributes: childAttributes([
                    h.Id('radix-radio'),
                    h.DataAttribute('root-owner', 'radix-radio'),
                  ]),
                  content: (context) => [
                    h.span([
                      h.DataAttribute('group-presentation', 'radix-radio'),
                      h.DataAttribute(
                        'size-provider',
                        useSizeContext(context.context, (size) => size).size,
                      ),
                    ]),
                    RadioItem({ label: 'radix-radio direct', index: 0 }, context, h),
                    Elevated(
                      {
                        ...context,
                        offset: 1,
                        children: () => [
                          RadioItem({ label: 'radix-radio wrapped', index: 1 }, context, h),
                        ],
                      },
                      h,
                    ),
                  ],
                },
              }),
            ),
            h.block(
              BaseRadios.embedView({
                slotId: model.baseRadios.id,
                model: model.baseRadios,
                viewInputs: {
                  context: presentation,
                  size: 'compact',
                  animate: motion.node,
                  animateHighlight,
                  className: 'root-base-radio',
                  attributes: childAttributes([
                    h.Id('base-radio'),
                    h.DataAttribute('root-owner', 'base-radio'),
                  ]),
                  content: (context) => [
                    h.span([
                      h.DataAttribute('group-presentation', 'base-radio'),
                      h.DataAttribute(
                        'size-provider',
                        useSizeContext(context.context, (size) => size).size,
                      ),
                    ]),
                    RadioItem({ label: 'base-radio direct', index: 0 }, context, h),
                    Elevated(
                      {
                        ...context,
                        offset: 1,
                        children: () => [
                          RadioItem({ label: 'base-radio wrapped', index: 1 }, context, h),
                        ],
                      },
                      h,
                    ),
                  ],
                },
              }),
            ),
          ],
        ),
    }),
  )

  const layer = Root.makeLayer({
    init: composition.makeInit(() => ({ model: {} })),
    update: composition.makeUpdate({}),
    view,
  }).pipe(Layer.provide(Layer.merge(CheckboxLayer, RadioLayer)))

  return { layer, motionLayer: motion.layer }
}

export const renderSelectionContext = () =>
  Effect.gen(function* renderSelectionProgram() {
    const { layer, motionLayer } = createSelectionContextLayer()
    const container = document.createElement('div')
    container.id = 'selection-context-host'
    const host = document.createElement('div')
    host.append(container)
    document.body.append(host)

    const program = Runtime.embed(
      Program.makeElement({ block: Root, layer, container }).provide(motionLayer),
    )

    try {
      yield* Effect.try(() => {
        if (host.querySelectorAll('[aria-label$=" wrapped"]').length !== 4) {
          throw new Error('Expected all four real selection groups to render')
        }
      }).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('20 millis') }))

      return { html: host.innerHTML }
    } finally {
      yield* Effect.promise(program.dispose)
      host.remove()
    }
  })
