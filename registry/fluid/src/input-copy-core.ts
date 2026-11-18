/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Data, Layer, Match, Option, Schema, Number } from 'effect'
import { Block } from 'foldkit'
import { InputCopyNamespace, Copy, Expire, ResultLifetime, Message } from './input-copy-effects.js'
import { Config, Model, InMessage, OutMessage, InputCopyEvent } from './input-copy-state.js'
import type { InputCopyConfig, Status } from './input-copy-state.js'
import { childAttributes } from 'foldkit/html'
import type { Attribute } from 'foldkit/html'
import type { InputCopyResources } from './input-copy-resources.js'
import { inputCopyPaint } from './input-copy-view.js'
import type { InputCopyViewInputs } from './input-copy-view.js'
import { EXIT_COMPLETE_EVENT } from './motion-target.js'

const copyResultLabel: (status: typeof Status.Type) => string = function copyResultLabel(
  status: typeof Status.Type,
) {
  return status === 'error' ? 'Copy failed' : 'Copied'
}

const effects = Block.makeEffectsContract<never, InputCopyResources>()

export const InputCopyKey = Symbol('InputCopy')

export const InputCopyBlock = Block.make(InputCopyNamespace, {
  key: InputCopyKey,
  InitArgs: Schema.Tuple([Config]),
  Model,
  Message,
  InMessage,
  OutMessage,
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<InputCopyViewInputs>(),
    mounts: [ResultLifetime],
  },
  effects,
  inMessageOutputs: { RequestedConfigure: { outMessage: OutMessage.Events } },
})

const InputCopyComposition = InputCopyBlock.makeComposition({ mounts: [ResultLifetime] })

export type InputCopyViewBuilder = Block.ViewBuilderFor<typeof InputCopyComposition>

const init = InputCopyComposition.makeInit((config: InputCopyConfig) => ({
  model: Model.make({
    ...config,
    variant: config.variant ?? 'icon',
    align: config.align ?? 'right',
    displayedVariant: config.variant ?? 'icon',
    glyphInitial: false,
    rootRevision: 0,
    lifetimeRevision: 0,
    hasMounted: false,
    disabled: config.disabled ?? false,
    status: 'idle',
    copyCount: 0,
    tooltipState: 'idle',
    tooltipVisible: false,
    tooltipWasVisible: false,
    displayed: 'idle',
    displayedCount: 0,
    exiting: false,
  }),
}))

function tooltipChanged(
  status: typeof Status.Type,
  state: (typeof Model.Type)['tooltipState'],
  copied = false,
  enabled = true,
) {
  const forceOpen = Match.value(state).pipe(
    Match.when('copied', () => true),
    Match.when('suppressed', () => false),
    Match.when('idle', () => null),
    Match.exhaustive,
  )

  const content = state === 'idle' ? 'Copy to clipboard' : copyResultLabel(status)

  return OutMessage.Events({
    events: [
      InputCopyEvent.cases.TooltipChanged.make({ enabled, forceOpen, content }),
      ...(copied ? [InputCopyEvent.cases.Copied.make({})] : []),
    ],
  })
}

const requestCopy = (model: typeof Model.Type) => ({
  model,
  commands: model.disabled
    ? []
    : [Copy({ value: model.value, lifetimeRevision: model.lifetimeRevision })],
})

const inMessageUpdate = InputCopyComposition.makeInMessageUpdate({
  RequestedConfigure: (model, values) => {
    const variant = values.variant ?? model.variant
    const align = values.align ?? model.align
    const rootChanged = align !== model.align || variant !== model.variant
    const updated = modifyFields(model, {
      value: () => values.value,
      disabled: () => values.disabled,
      variant: () => variant,
      align: () => align,
    })

    const next = rootChanged
      ? modifyFields(updated, {
          rootRevision: () => model.rootRevision + 1,
          displayedVariant: () => variant,
          displayed: () => model.status,
          displayedCount: () => model.copyCount,
          exiting: () => false,
          glyphInitial: () => false,
        })
      : modifyFields(updated, {
          exiting: () =>
            variant !== model.displayedVariant ||
            model.status !== model.displayed ||
            (model.status !== 'idle' && model.copyCount !== model.displayedCount),
        })

    const result = { model: next }

    return variant === model.variant
      ? result
      : {
          ...result,
          outMessage: tooltipChanged(model.status, model.tooltipState, false, variant === 'icon'),
        }
  },
  RequestedCopy: requestCopy,
  InformedOfTooltipVisibility: (model, { open }) => ({
    model: modifyFields(model, { tooltipVisible: () => open }),
  }),
})

const update = InputCopyComposition.makeUpdate({
  CapturedCopy: requestCopy,
  CapturedMount: (model) =>
    model.hasMounted
      ? {
          model: modifyFields(model, {
            lifetimeRevision: Number.increment,
            rootRevision: Number.increment,
            status: () => 'idle',
            copyCount: () => 0,
            tooltipState: () => 'idle',
            tooltipVisible: () => false,
            tooltipWasVisible: () => false,
            displayed: () => 'idle',
            displayedCount: () => 0,
            displayedVariant: () => model.variant,
            glyphInitial: () => false,
            exiting: () => false,
          }),
          outMessage: tooltipChanged('idle', 'idle', false, model.variant === 'icon'),
        }
      : { model: modifyFields(model, { hasMounted: () => true }) },
  CapturedPointerDown: (model) => ({
    model: modifyFields(model, { tooltipWasVisible: () => model.tooltipVisible }),
  }),
  CapturedEnter: (model) => {
    const result = {
      model: modifyFields(model, {
        tooltipState: (currentTooltipState) =>
          currentTooltipState === 'suppressed' ? 'idle' : currentTooltipState,
      }) satisfies typeof Model.Type,
    }

    return model.tooltipState === 'suppressed'
      ? {
          ...result,
          outMessage: tooltipChanged(model.status, 'idle', false, model.variant === 'icon'),
        }
      : result
  },
  CapturedLeave: (model) => {
    const result = {
      model: modifyFields(model, {
        tooltipState: (currentTooltipState) =>
          currentTooltipState === 'copied' ? 'suppressed' : currentTooltipState,
      }) satisfies typeof Model.Type,
    }

    return model.tooltipState === 'copied'
      ? {
          ...result,
          outMessage: tooltipChanged(model.status, 'suppressed', false, model.variant === 'icon'),
        }
      : result
  },
  CompletedCopy: (model, { ok, lifetimeRevision }) =>
    lifetimeRevision === model.lifetimeRevision
      ? {
          model: modifyFields(model, {
            status: () => (ok ? 'copied' : 'error'),
            copyCount: Number.increment,
            tooltipState: () => (model.tooltipWasVisible ? 'copied' : 'suppressed'),
            exiting: () => true,
          }),
          commands: [Expire({ id: model.id, copyCount: model.copyCount + 1, lifetimeRevision })],
          outMessage: tooltipChanged(
            ok ? 'copied' : 'error',
            model.tooltipWasVisible ? 'copied' : 'suppressed',
            ok,
            model.variant === 'icon',
          ),
        }
      : { model },
  ExpiredResult: (model, { copyCount, lifetimeRevision }) =>
    lifetimeRevision === model.lifetimeRevision && copyCount === model.copyCount
      ? {
          model: modifyFields(model, {
            status: () => 'idle',
            tooltipState: () => 'suppressed',
            exiting: () => model.displayed !== 'idle' || model.displayedVariant !== model.variant,
          }),
          outMessage: tooltipChanged('idle', 'suppressed', false, model.variant === 'icon'),
        }
      : { model },
  CompletedGlyphExit: (model, { rootRevision, displayedCount, displayed, displayedVariant }) =>
    !model.exiting ||
    rootRevision !== model.rootRevision ||
    displayedCount !== model.displayedCount ||
    displayed !== model.displayed ||
    displayedVariant !== model.displayedVariant
      ? { model }
      : {
          model: modifyFields(model, {
            displayed: () => model.status,
            displayedCount: () => model.copyCount,
            displayedVariant: () => model.variant,
            glyphInitial: () => true,
            exiting: () => false,
          }),
        },
})

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const view = InputCopyComposition.makeView.withInputs<InputCopyViewInputs>((model, inputs, h) => {
  const completed = Events.OnCustomEvent({
    name: EXIT_COMPLETE_EVENT,
    f: () =>
      Option.some(
        Message.CompletedGlyphExit({
          rootRevision: model.rootRevision,
          displayed: model.displayed,
          displayedCount: model.displayedCount,
          displayedVariant: model.displayedVariant,
        }),
      ),
  })

  return inputCopyPaint(model, inputs, h, {
    copy: Message.CapturedCopy(),
    mount: childAttributes([h.OnMount(ResultLifetime({ id: model.id }))]),
    down: h.OnPointerDown(() => Option.some(Message.CapturedPointerDown())),
    enter: h.OnMouseEnter(Message.CapturedEnter()),
    leave: h.OnMouseLeave(Message.CapturedLeave()),
    completed,
  })
})

export const layer = InputCopyBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(Copy.layer, Expire.layer, ResultLifetime.layer),
})

export { InputCopyResources, createInputCopyLayer } from './input-copy-resources.js'

export type { InputCopyViewInputs } from './input-copy-view.js'

export { Config as InputCopyConfigSchema, InMessage, InputCopyEvent } from './input-copy-state.js'

export type { InputCopyConfig } from './input-copy-state.js'
