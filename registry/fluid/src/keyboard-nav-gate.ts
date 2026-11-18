/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Effect, Layer, Queue, Schema, Stream, Number } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { POPUP_NAV_KEYS } from './lib/popup.js'

const Model = Schema.Struct({
  id: Schema.String,
  open: Schema.Boolean,
  keyboardNav: Schema.Boolean,
  generation: Schema.Natural,
})

const Message = defineMessageUnion({
  CapturedFocusVisible: { generation: Schema.Natural, value: Schema.Boolean },
  CapturedNavigation: { key: Schema.String },
})

const InMessage = defineInMessageUnion({ RequestedOpen: { open: Schema.Boolean } })

const Config = Schema.Struct({ id: Schema.String, open: Schema.optionalKey(Schema.Boolean) })

const effects = Block.makeEffectsContract()

export const KeyboardNavGateKey = Symbol('KeyboardNavGate')

export const KeyboardNavGateBlock = Block.make('KeyboardNavGate', {
  key: KeyboardNavGateKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<KeyboardNavGateViewInputs>() },
  effects,
})

const CaptureFocus = KeyboardNavGateBlock.makeCommand('CaptureFocus', {
  args: { generation: Schema.Natural },
  messages: [Message.CapturedFocusVisible],
  *handler() {
    return ({ generation }) =>
      Effect.sync(() => {
        const active = globalThis.document.activeElement

        return Message.CapturedFocusVisible({
          generation,
          value: active !== null && active.matches(':focus-visible'),
        })
      })
  },
})

const ObserveNavigation = KeyboardNavGateBlock.makeMountStream('ObserveNavigation', {
  messages: [Message.CapturedNavigation],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.CapturedNavigation.Type>((queue) => {
                const listener = (event: Event) => {
                  if (event instanceof KeyboardEvent && POPUP_NAV_KEYS.includes(event.key)) {
                    Queue.offerUnsafe(queue, Message.CapturedNavigation({ key: event.key }))
                  }
                }

                return Effect.acquireRelease(
                  Effect.sync(() => {
                    element.addEventListener('keydown', listener, true)

                    return () => {
                      element.removeEventListener('keydown', listener, true)
                    }
                  }),
                  (dispose) => Effect.sync(dispose),
                ).pipe(Effect.flatMap(() => Effect.never))
              })
            : Stream.never,
        ),
      )
  },
})

const KeyboardNavGateComposition = KeyboardNavGateBlock.makeComposition({
  mounts: [ObserveNavigation],
})

export interface KeyboardNavGateConfig {
  readonly id: string
  readonly open?: boolean
}

const init = KeyboardNavGateComposition.makeInit((config: KeyboardNavGateConfig) => ({
  model: Model.make({
    id: config.id,
    open: config.open ?? false,
    keyboardNav: false,
    generation: 0,
  }),
  commands: config.open === true ? [CaptureFocus({ generation: 0 })] : [],
}))

const inMessageUpdate = KeyboardNavGateComposition.makeInMessageUpdate({
  RequestedOpen: (model, { open }) =>
    open === model.open
      ? { model }
      : {
          model: modifyFields(model, {
            open: () => open,
            keyboardNav: (currentKeyboardNav) => (open ? false : currentKeyboardNav),
            generation: Number.increment,
          }),
          commands: open ? [CaptureFocus({ generation: model.generation + 1 })] : [],
        },
})

const update = KeyboardNavGateComposition.makeUpdate({
  CapturedFocusVisible: (model, { generation, value }) => ({
    model:
      model.open && generation === model.generation
        ? modifyFields(model, { keyboardNav: (currentKeyboardNav) => currentKeyboardNav || value })
        : model,
  }),
  CapturedNavigation: (model, { key }) => ({
    model:
      POPUP_NAV_KEYS.includes(key) && !model.keyboardNav
        ? modifyFields(model, { keyboardNav: () => true })
        : model,
  }),
})

export interface KeyboardNavGateViewInputs {
  readonly content: (state: { readonly keyboardNav: boolean }) => ReadonlyArray<Html>
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const view = KeyboardNavGateComposition.makeView.withInputs((model, inputs, h) =>
  h.div(
    [
      h.Class(inputs.className === undefined ? '' : inputs.className),
      h.Id(model.id),
      h.DataAttribute('keyboard-nav', String(model.keyboardNav)),
      h.OnMount(ObserveNavigation()),
      ...(inputs.attributes ?? []),
    ],
    inputs.content({ keyboardNav: model.keyboardNav }),
  ),
)

export const KeyboardNavGateLayer = KeyboardNavGateBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(CaptureFocus.layer, ObserveNavigation.layer),
})

export const test = { CaptureFocus, ObserveNavigation }
