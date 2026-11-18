import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { fontWeights } from './lib/font-weight.js'
/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Textarea } from '@foldkit/ui'
import { Schema, Number } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { formControlClasses, formControlDefault } from './form-control-dom.js'

const Model = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  disabled: Schema.Boolean,
  readOnly: Schema.Boolean,
  inputRevision: Schema.Natural,
})

const Message = defineMessageUnion({ CapturedInput: { value: Schema.String } })

const OutMessage = defineMessageUnion({ Changed: { value: Schema.String } })

const InMessage = defineInMessageUnion({
  RequestedConfigure: { value: Schema.String, disabled: Schema.Boolean, readOnly: Schema.Boolean },
})

const Config = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  disabled: Schema.optionalKey(Schema.Boolean),
  readOnly: Schema.optionalKey(Schema.Boolean),
})

const effects = Block.makeEffectsContract()

export const TextareaKey = Symbol('Textarea')

export const TextareaBlock = Block.make('Textarea', {
  key: TextareaKey,
  Model,
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<TextareaViewInputs>() },
  effects,
})

const TextareaComposition = TextareaBlock.makeComposition({})

export interface TextareaConfig {
  readonly id: string
  readonly value: string
  readonly disabled?: boolean
  readonly readOnly?: boolean
}

export interface TextareaViewInputs extends Presentation {
  readonly appearance?: 'default' | 'editor'
  readonly name?: string
  readonly placeholder?: string
  readonly invalid?: boolean
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const init = TextareaComposition.makeInit((config: TextareaConfig) => ({
  model: {
    ...config,
    disabled: config.disabled ?? false,
    readOnly: config.readOnly ?? false,
    inputRevision: 0,
  },
}))

const update = TextareaComposition.makeUpdate({
  CapturedInput: (model, { value }) =>
    model.disabled || model.readOnly
      ? { model: modifyFields(model, { inputRevision: Number.increment }) }
      : {
          model: modifyFields(model, { inputRevision: Number.increment }),
          outMessage: OutMessage.Changed({ value }),
        },
})

const inMessageUpdate = TextareaComposition.makeInMessageUpdate({
  RequestedConfigure: (model, { value, disabled, readOnly }) => ({
    model: modifyFields(model, {
      value: () => value,
      disabled: () => disabled,
      readOnly: () => readOnly,
    }),
  }),
})

const view = TextareaComposition.makeView.withInputs<TextareaViewInputs>((model, inputs, h) => {
  const { size, shape } = resolvePresentation(inputs)
  const compact = size.variant === 'compact'

  const config: Textarea.ViewConfig<typeof Message.Type> = {
    id: model.id,
    value: model.value,
    isDisabled: model.disabled,
    isReadOnly: model.readOnly,
    isInvalid: inputs.invalid ?? false,
    onInput: (value) => Message.CapturedInput({ value }),
    toView: (attributes) =>
      formControlDefault(
        h.textarea(
          sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
            h.Class(
              cn(
                formControlClasses,
                'field-sizing-content resize-none',
                compact ? 'min-h-[64px] py-1 max-h-[190px]' : 'min-h-[76px] py-[7px] max-h-[216px]',
                shape.variant === 'pill' ? shape.mergedBg : shape.input,
                size.px,
                size.field,
                inputs.appearance === 'editor' && 'min-h-[320px] max-h-none! font-mono',
                inputs.className,
              ),
            ),
            ...attributes.textarea,
            h.DataAttribute('slot', 'textarea'),
            ...(inputs.attributes ?? []),
          ]),
        ),
        model.value,
      ),
  }

  let configured = config

  if (inputs.name !== undefined) {
    configured = { ...configured, name: inputs.name }
  }

  if (inputs.placeholder !== undefined) {
    configured = { ...configured, placeholder: inputs.placeholder }
  }

  return Textarea.view(configured, h)
})

export const layer = TextareaBlock.makeLayer({ init, update, inMessageUpdate, view })
