import { examplePresentation } from './example-presentation.js'
import type { DropdownResources } from '@foldkit-visuals/fluid/dropdown/environment'
import { selectionFamilyRouter } from './selection-family-routes.js'
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { SelectBlock, layer as SelectLayer, createSelectLayer } from '@foldkit-visuals/fluid/select'
import type { SelectDeclared } from '@foldkit-visuals/fluid/select'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import type { TargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
const items = ['Apple', 'Banana', 'Cherry', 'Mango'].map((label) => ({
  label,
  value: label.toLowerCase(),
}))
const context = createPresentationContext({ reducedMotion: 'user', ...examplePresentation })
const Model = Schema.Struct({ select: SelectBlock.Model, value: Schema.String })
const Message = defineMessageUnion({})
const effects = Block.makeEffectsContract<never, DropdownResources>()
const contract = {
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
} satisfies Omit<Block.ContractConfiguration, 'key'> & {
  readonly Model: typeof Model
  readonly Message: typeof Message
}
const SourceSelectNamespace = Block.makeNamespace('SourceSelect')
export const SourceSelectKey = Symbol('SourceSelect')
export const SourceSelectBlock = Block.make(SourceSelectNamespace, {
  ...contract,
  key: SourceSelectKey,
})
const selectSourcePlans = <const Key extends symbol, const ChildKey extends symbol>(
  Definition: ReturnType<typeof Block.make<'SourceSelect', Key, typeof contract>>,
  Component: SelectDeclared<ChildKey>,
  motion: TargetMotionScope,
) => {
  const RawSelect = Definition.makeRequiredFieldBinding(Component, {
    field: 'select',
    init: { contextToArgs: () => [{ id: 'source-fruit', items, value: '' }] },
  })
  const Select = RawSelect.withOutMessagePolicy({
    fold: Definition.makeOutMessageFold(Component, {
      Selected: ({ value }) =>
        Update.combineSteps([
          Definition.makeFieldsStep(() => ({ value: () => value })),
          RawSelect.requestConfigure({ items, value }),
        ]),
      OpenChanged: Definition.makeNoopStep,
    }),
  })
  const Composition = Definition.makeComposition({ bindings: [Select] })
  const init = Composition.makeInit(() => ({ model: { value: '' } }))
  const update = Composition.makeUpdate({})
  const view = Composition.makeView((model, h) => ({
    title: 'Fluid Select',
    body: h.main(
      [
        h.Class(
          'max-w-240 m-[0_auto] p-[40px_24px] [&_h1]:text-[26px] [&_h1]:mb-3 [&_section]:m-[28px_0] [&_h2]:text-[16px] [&_h2]:mb-3 [&_output]:block [&_output]:p-[12px_0] [&_output]:[color:var(--muted-foreground)]',
        ),
      ],
      [
        h.a([h.Href(selectionFamilyRouter({}))], ['← All selection examples']),
        h.h1([], ['Select']),
        h.section(
          [],
          [
            h.block(
              Select.embedView({
                slotId: model.select.id,
                model: model.select,
                viewInputs: {
                  context,
                  placeholder: 'Select a fruit…',
                  animate: motion.node,
                  ...examplePresentation,
                },
              }),
            ),
          ],
        ),
      ],
    ),
  }))
  return { init, update, view }
}
export const SourceSelectLayer = Layer.unwrap(
  Effect.sync(() => {
    const motion = createTargetMotionScope('fluid-select-source')
    const implementation = selectSourcePlans(SourceSelectBlock, SelectBlock, motion)
    return SourceSelectBlock.makeLayer<typeof implementation>(implementation).pipe(
      Layer.provide(SelectLayer),
      Layer.provideMerge(motion.layer),
    )
  }),
)
export const selectSourceProgram = (container: HTMLElement | null) =>
  Program.make({ block: SourceSelectBlock, layer: SourceSelectLayer, container }).provide({
    services: createSelectLayer(document),
  })
