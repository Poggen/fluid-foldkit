import { modifyFields } from 'foldkit/struct'
import { Effect, Function, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { Field } from './field-parts.js'
import type { FieldProps } from './field-parts.js'
import { linkField } from './field-dom.js'

const Model = Schema.Struct({ id: Schema.String, descriptionIds: Schema.Array(Schema.String) })

const Message = defineMessageUnion({ Associated: { descriptionIds: Schema.Array(Schema.String) } })

const Config = Schema.Struct({ id: Schema.String })

const effects = Block.makeEffectsContract()

export const FieldKey = Symbol('Field')

export const FieldBlock = Block.make('Field', {
  key: FieldKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<FieldViewInputs>() },
  effects,
})

const Associate = FieldBlock.makeMountStream('Associate', {
  messages: [Message.Associated],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.Associated.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    if (!(element instanceof HTMLElement)) {
                      return Function.constVoid
                    }

                    let previous = ''

                    const synchronize = () => {
                      const ids = linkField(element, element.id)
                      const signature = ids.join(' ')

                      if (signature !== previous) {
                        previous = signature
                        Queue.offerUnsafe(queue, Message.Associated({ descriptionIds: ids }))
                      }
                    }

                    const observer = new MutationObserver(synchronize)
                    observer.observe(element, {
                      subtree: true,
                      childList: true,
                      attributes: true,
                      attributeFilter: ['id', 'aria-describedby', 'data-slot'],
                    })
                    synchronize()

                    return () => {
                      observer.disconnect()
                    }
                  }),
                  (dispose) => Effect.sync(dispose),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})

const FieldComposition = FieldBlock.makeComposition({ mounts: [Associate] })

export interface FieldConfig {
  readonly id: string
}

export interface FieldViewInputs extends Omit<FieldProps<never>, 'children' | 'id' | 'attributes'> {
  readonly content: () => ReadonlyArray<Html>
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const init = FieldComposition.makeInit((config: FieldConfig) => ({
  model: { id: config.id, descriptionIds: [] },
}))

const update = FieldComposition.makeUpdate({
  Associated: (model, { descriptionIds }) => ({
    model: modifyFields(model, { descriptionIds: () => descriptionIds }),
  }),
})

const view = FieldComposition.makeView.withInputs<FieldViewInputs>((model, inputs, h) =>
  Field(
    {
      ...inputs,
      id: model.id,
      attributes: [h.OnMount(Associate()), ...(inputs.attributes ?? [])],
      children: inputs.content(),
    },
    h,
  ),
)

export const layer = FieldBlock.makeLayer({ init, update, view, EffectsLayer: Associate.layer })
