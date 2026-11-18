import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { fontWeights } from './lib/font-weight.js'
import { modifyFields } from 'foldkit/struct'
import { mountInputContainer } from './input-group-observer.js'
import { inputBackground, inputRing } from './input-group-style.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import * as Primitive from '@foldkit/ui/input'
import { inputControlDefault } from './input-group-control.js'
import { Effect, Queue, Schema, Stream, Number } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { hoverItemAttributes } from './hover.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Icon, Presentation } from './presentation.js'

const Model = Schema.Struct({
  id: Schema.String,
  index: Schema.Int,
  value: Schema.String,
  disabled: Schema.Boolean,
  readOnly: Schema.Boolean,
  focused: Schema.Boolean,
  inputRevision: Schema.Natural,
})

const Message = defineMessageUnion({
  CapturedFocus: { focused: Schema.Boolean },
  CapturedInput: { value: Schema.String },
  Unmounted: {},
})

const OutMessage = defineMessageUnion({ Changed: { value: Schema.String } })

export const InMessage = defineInMessageUnion({
  RequestedConfigure: { value: Schema.String, disabled: Schema.Boolean, readOnly: Schema.Boolean },
})

const Config = Schema.Struct({
  id: Schema.String,
  index: Schema.Int,
  value: Schema.String,
  disabled: Schema.optionalKey(Schema.Boolean),
  readOnly: Schema.optionalKey(Schema.Boolean),
})

const effects = Block.makeEffectsContract()

export const InputFieldKey = Symbol('InputField')

export const InputFieldBlock = Block.make('InputField', {
  key: InputFieldKey,
  Model,
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<InputFieldViewInputs>() },
  effects,
})

const ObserveContainer = InputFieldBlock.makeMountStream('ObserveContainer', {
  messages: [Message.CapturedFocus],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.CapturedFocus.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() =>
                    mountInputContainer(element, (focused) => {
                      Queue.offerUnsafe(queue, Message.CapturedFocus({ focused }))
                    }),
                  ),
                  (dispose) => Effect.sync(dispose),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})

const InputFieldComposition = InputFieldBlock.makeComposition({
  mounts: [ObserveContainer],
})

export interface InputFieldConfig {
  readonly id: string
  readonly index: number
  readonly value: string
  readonly disabled?: boolean
  readonly readOnly?: boolean
}

const init = InputFieldComposition.makeInit((config: InputFieldConfig) => ({
  model: Model.make({
    ...config,
    disabled: config.disabled ?? false,
    readOnly: config.readOnly ?? false,
    focused: false,
    inputRevision: 0,
  }),
}))

const update = InputFieldComposition.makeUpdate({
  CapturedFocus: (model, { focused }) => ({
    model: modifyFields(model, { focused: () => focused }),
  }),
  CapturedInput: (model, { value }) => {
    const next = modifyFields(model, { inputRevision: Number.increment })

    return model.disabled || model.readOnly
      ? { model: next }
      : { model: next, outMessage: OutMessage.Changed({ value }) }
  },
  Unmounted: (model) => ({ model: modifyFields(model, { focused: () => false }) }),
})

const inMessageUpdate = InputFieldComposition.makeInMessageUpdate({
  RequestedConfigure: (model, { value, disabled, readOnly }) => ({
    model: modifyFields(model, {
      value: () => value,
      disabled: () => disabled,
      readOnly: () => readOnly,
    }),
  }),
})

export interface InputFieldViewInputs extends Presentation {
  readonly label: string
  readonly labelHidden?: boolean
  readonly placeholder?: string
  readonly icon?: Icon
  readonly activeIndex?: number | null
  readonly error?: string
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly inputAttributes?: ReadonlyArray<ChildAttribute>
}

const view = InputFieldComposition.makeView.withInputs<InputFieldViewInputs>((model, inputs, h) => {
  const { size, shape, icons } = resolvePresentation(inputs)
  const compact = size.variant === 'compact'
  const active = inputs.activeIndex === model.index
  const labelActive = active || model.focused
  const error = Boolean(inputs.error)

  const background = inputBackground(model.disabled, error, model.focused, active)
  const ring = inputRing(model.disabled, error, model.focused, active)

  const config: Primitive.ViewConfig<typeof Message.Type> = {
    id: model.id,
    value: model.value,
    isDisabled: model.disabled,
    isReadOnly: model.readOnly,
    isInvalid: error,
    hasDescription: error,
    onInput: (value) => Message.CapturedInput({ value }),
    toView: (attributes) =>
      h.div(
        [
          h.OnMount(ObserveContainer()),
          h.OnUnmount(Message.Unmounted()),
          h.DataAttribute('fluid-hover-index', String(model.index)),
          ...hoverItemAttributes(model.index, false, inputs.activeIndex ?? null),
          h.DataAttribute('slot', 'input-field'),
          ...(model.disabled ? [h.DataAttribute('disabled', '')] : []),
          ...(error ? [h.DataAttribute('invalid', '')] : []),
          h.Class(
            cn(
              'flex flex-col gap-1 cursor-text',
              model.disabled && 'opacity-50 pointer-events-none',
              inputs.className,
            ),
          ),
          ...(inputs.attributes ?? []),
        ],
        [
          h.label(
            [
              ...attributes.label,
              h.Class(cn(inputs.labelHidden === true ? 'sr-only' : 'inline-grid', size.text)),
            ],
            [
              h.span(
                [
                  h.Class('col-start-1 row-start-1 invisible'),
                  h.AriaHidden(true),
                  h.Style({ fontVariationSettings: fontWeights.semibold }),
                ],
                [inputs.label],
              ),
              h.span(
                [
                  h.Class(
                    cn(
                      'col-start-1 row-start-1',
                      error ? 'text-destructive' : 'text-muted-foreground',
                    ),
                  ),
                  h.Style({ fontVariationSettings: fontWeights.normal }),
                ],
                [inputs.label],
              ),
            ],
          ),
          h.div(
            [
              h.DataAttribute('slot', 'input-container'),
              h.Class(
                cn(
                  `flex items-center ${size.gap} ${shape.input} ${size.px} ${size.control} ring-1 ring-inset transition-[color,background-color,border-radius,box-shadow] duration-80`,
                  background,
                  ring,
                ),
              ),
            ],
            [
              inputs.icon?.(
                {
                  size: size.icon,
                  strokeWidth: labelActive ? 2 : 1.5,
                  className: cn(
                    'shrink-0 transition-[color,stroke-width] duration-80',
                    labelActive ? 'text-foreground' : 'text-muted-foreground',
                  ),
                },
                h,
              ) ?? null,
              inputControlDefault(
                h.input(
                  sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
                    h.Class(
                      cn(
                        'w-full rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
                        size.field,
                      ),
                    ),
                    ...attributes.input,
                    ...(inputs.inputAttributes ?? []),
                  ]),
                ),
                model.value,
              ),
            ],
          ),
          inputs.error !== undefined && inputs.error !== ''
            ? h.div(
                sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
                  h.Class(
                    cn(
                      'flex items-center text-destructive',
                      size.gap,
                      compact
                        ? 'text-[length:var(--fs-caption-compact,11px)] leading-[var(--lh-caption-compact,14px)]'
                        : 'text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)]',
                    ),
                  ),
                  ...attributes.description,
                  h.Role('alert'),
                ]),
                [
                  icons['circle-alert'](
                    { size: compact ? 12 : 14, strokeWidth: 1.75, className: 'shrink-0' },
                    h,
                  ),
                  inputs.error,
                ],
              )
            : null,
        ],
      ),
  }

  return Primitive.view(
    inputs.placeholder === undefined ? config : { ...config, placeholder: inputs.placeholder },
    h,
  )
})

export const layer = InputFieldBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: ObserveContainer.layer,
})
