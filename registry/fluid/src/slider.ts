/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Effect, Layer, Option, Predicate, Schema, Number as EffectNumber } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  SliderModel,
  SliderSettings,
  SliderValue,
  sliderInitial,
  sliderTargets,
  sliderSnap,
  sliderReplace,
  sliderValues,
  SliderConfig,
} from './slider-state.js'
import { SliderObservation, observeSlider } from './slider-observer.js'
import { sliderKeyboard, sliderPointer } from './slider-update.js'
import { sliderCompactView } from './slider-compact.js'
import { sliderComfortableView } from './slider-comfortable.js'
import type { SliderViewInputs } from './slider-parts.js'

const Model = SliderModel

type Model = typeof Model.Type

const Message = defineMessageUnion({
  CapturedMount: { width: Schema.Number },
  CapturedResize: { width: Schema.Number },
  CapturedPointer: SliderObservation.CapturedPointer.fields,
  CapturedHover: { hovered: Schema.Boolean },
  CapturedFocus: { index: Schema.Int, visible: Schema.Boolean },
  CapturedBlur: { index: Schema.Int },
  CapturedKey: SliderObservation.CapturedKey.fields,
  StartedEdit: { index: Schema.Int },
  EditedDraft: { value: Schema.String },
  CommittedEdit: {},
  CancelledEdit: {},
  CompletedHoverDelay: { generation: Schema.Natural },
  CompletedEditFocus: {},
  Unmounted: {},
})

const OutMessage = defineMessageUnion({ Changed: { value: SliderValue } })

export const InMessage = defineInMessageUnion({
  RequestedSettings: { settings: SliderSettings },
})

export const SliderKey = Symbol('Slider')

const effects = Block.makeEffectsContract()

export const SliderBlock = Block.make('Slider', {
  key: SliderKey,
  InitArgs: Schema.Tuple([SliderConfig]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<SliderViewInputs>() },
  effects,
})

const Observe = SliderBlock.makeMountStream('Observe', {
  messages: [
    Message.CapturedMount,
    Message.CapturedResize,
    Message.CapturedPointer,
    Message.CapturedHover,
    Message.CapturedFocus,
    Message.CapturedBlur,
    Message.CapturedKey,
    Message.StartedEdit,
    Message.EditedDraft,
    Message.CommittedEdit,
    Message.CancelledEdit,
  ],
  *handler() {
    return ({ element, viewStateChanges }) => observeSlider(element, viewStateChanges)
  },
})

const HoverDelay = SliderBlock.makeCommand('HoverDelay', {
  args: { generation: Schema.Natural },
  messages: [Message.CompletedHoverDelay],
  *handler() {
    return ({ generation }) =>
      Effect.sleep('100 millis').pipe(Effect.as(Message.CompletedHoverDelay({ generation })))
  },
})

const SelectEdit = SliderBlock.makeCommand('SelectEdit', {
  args: { id: Schema.String },
  messages: [Message.CompletedEditFocus],
  *handler() {
    return ({ id }) =>
      Effect.callback<typeof Message.CompletedEditFocus.Type>((resume) => {
        const frame = requestAnimationFrame(() => {
          const input = globalThis.document
            .querySelector(`[id="${CSS.escape(id)}"]`)
            ?.querySelector('[data-slider-input]')

          if (input instanceof HTMLInputElement) {
            input.focus()
            input.select()
          }

          resume(Effect.succeed(Message.CompletedEditFocus()))
        })

        return Effect.sync(() => {
          cancelAnimationFrame(frame)
        })
      })
  },
})

const SliderComposition = SliderBlock.makeComposition({
  mounts: [Observe],
})

const init = SliderComposition.makeInit((config: SliderConfig) => ({
  model: sliderInitial(config),
}))

const withValue = (model: Model, value: SliderValue | undefined) =>
  value === undefined ? { model } : { model, outMessage: OutMessage.Changed({ value }) }

const update = SliderComposition.makeUpdate({
  CapturedMount: (model, { width }) => ({
    model: sliderTargets(
      modifyFields(model, {
        width: () => width,
        ready: () => true,
        immediate: () => true,
        revision: EffectNumber.increment,
      }),
    ),
  }),
  CapturedResize: (model, { width }) => ({
    model:
      model.drag === 'idle'
        ? sliderTargets(
            modifyFields(model, {
              width: () => width,
              immediate: () => false,
              revision: EffectNumber.increment,
            }),
          )
        : modifyFields(model, { width: () => width }),
  }),
  CapturedPointer: (model, event) => {
    const result = sliderPointer(model, event)

    return withValue(result.model, result.value)
  },
  CapturedHover: (model, { hovered }) => {
    if (!model.settings.compact && model.settings.disabled) {
      return { model }
    }

    const generation = model.generation + 1

    const next = modifyFields(model, {
      hovered: () => hovered,
      hoverDelayDone: () => false,
      generation: () => generation,
      preview: (currentPreview) => (hovered ? currentPreview : Option.none()),
    })

    return hovered ? { model: next, commands: [HoverDelay({ generation })] } : { model: next }
  },
  CompletedHoverDelay: (model, { generation }) => ({
    model:
      generation === model.generation && model.hovered
        ? modifyFields(model, { hoverDelayDone: () => true })
        : model,
  }),
  CapturedFocus: (model, { index, visible }) => ({
    model: modifyFields(model, {
      focusedThumb: (currentFocusedThumb) => (visible ? Option.some(index) : currentFocusedThumb),
    }),
  }),
  CapturedBlur: (model, { index }) => ({
    model: modifyFields(model, {
      focusedThumb: (currentFocusedThumb) =>
        Option.getOrNull(currentFocusedThumb) === index ? Option.none() : currentFocusedThumb,
    }),
  }),
  CapturedKey: (model, { index, key, shift }) => {
    const value = sliderKeyboard(model, index, key, shift)

    return withValue(model, value)
  },
  StartedEdit: (model, { index }) => ({
    model: modifyFields(model, {
      editingIndex: () => Option.some(index),
      draft: () => String(sliderValues(model.settings.value)[index]),
    }),
    commands: [SelectEdit({ id: model.id })],
  }),
  EditedDraft: (model, { value }) => ({ model: modifyFields(model, { draft: () => value }) }),
  CommittedEdit: (model) => {
    if (Option.isNone(model.editingIndex)) {
      return { model }
    }

    // eslint-disable-next-line unicorn/prefer-number-coercion -- Source accepts numeric prefixes and treats blank drafts as NaN; Number changes committed values.
    const parsed = Number.parseFloat(model.draft)

    const value = sliderReplace(
      model.settings.value,
      model.editingIndex.value,
      model.settings.steps.length > 1
        ? sliderSnap(parsed, model.settings)
        : Math.round(
            (Math.max(model.settings.min, Math.min(model.settings.max, parsed)) -
              model.settings.min) /
              model.settings.step,
          ) *
            model.settings.step +
            model.settings.min,
    )

    return withValue(
      modifyFields(model, { editingIndex: () => Option.none() }),
      Number.isNaN(parsed) ? undefined : value,
    )
  },
  CancelledEdit: (model) => ({ model: modifyFields(model, { editingIndex: () => Option.none() }) }),
  CompletedEditFocus: (model) => ({ model }),
  Unmounted: (model) => ({
    model: modifyFields(model, {
      hovered: () => false,
      hoverDelayDone: () => false,
      generation: EffectNumber.increment,
      drag: () => 'idle',
      focusedThumb: () => Option.none(),
      editingIndex: () => Option.none(),
      preview: () => Option.none(),
      ready: () => false,
    }),
  }),
})

const inMessageUpdate = SliderComposition.makeInMessageUpdate({
  RequestedSettings: (model, { settings }) => {
    const next = modifyFields(model, { settings: () => settings })

    if (model.drag !== 'idle') return { model: next }

    const targeted = sliderTargets(next)

    const retarget = targeted !== next || settings.compact !== model.settings.compact

    return {
      model: modifyFields(targeted, {
        immediate: () => false,
        revision: (revision) => (retarget ? revision + 1 : revision),
      }),
    }
  },
})

const view = SliderComposition.makeView.withInputs<SliderViewInputs>((model, inputs, h) => {
  const attributes = [
    h.OnMount(Observe()),
    ...(Predicate.isUndefined(globalThis.window) ? [] : [h.OnUnmount(Message.Unmounted())]),
  ]

  return model.settings.compact
    ? sliderCompactView(model, inputs, attributes, h)
    : sliderComfortableView(model, inputs, attributes, h)
})

export const layer = SliderBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(Observe.layer, HoverDelay.layer, SelectEdit.layer),
})

export type { SliderConfig, SliderValue, ValuePosition } from './slider-state.js'

export { sliderSettings, sliderSnap } from './slider-state.js'

export type { SliderViewInputs } from './slider-parts.js'

export { createSliderMotionScope } from './slider-motion.js'

export { sliderPresentationSettings } from './slider-presentation.js'

export const test = { HoverDelay, SelectEdit, Observe }
