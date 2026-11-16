import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { fontWeights } from './lib/font-weight.js'
// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { InputFileResources, InputFile } from './input-file-resources.js'
import * as Primitive from '@foldkit/ui/input'
import { Effect, Function, Schema, Stream, Number } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { nestedRadius } from './lib/shape.js'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import {
  formControlClasses,
  formControlDefault,
  stepNumberInput,
  preventNumberButtonFocus,
} from './form-control-dom.js'

const Model = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  disabled: Schema.Boolean,
  readOnly: Schema.Boolean,
  inputRevision: Schema.Natural,
  hasFile: Schema.Boolean,
})

const Message = defineMessageUnion({
  CapturedInput: { value: Schema.String },
  CapturedFiles: { files: Schema.Array(InputFile) },
})

const OutMessage = defineMessageUnion({
  Changed: { value: Schema.String },
  FilesChanged: { files: Schema.Array(InputFile) },
})

const InMessage = defineInMessageUnion({
  RequestedConfigure: { value: Schema.String, disabled: Schema.Boolean, readOnly: Schema.Boolean },
})

const Config = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  disabled: Schema.optionalKey(Schema.Boolean),
  readOnly: Schema.optionalKey(Schema.Boolean),
})

const effects = Block.makeEffectsContract<never, InputFileResources>()

export const InputKey = Symbol('Input')

export const InputBlock = Block.make('Input', {
  key: InputKey,
  Model,
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<InputViewInputs>() },
  effects,
})

const ObserveInput = InputBlock.makeMountStream('ObserveInput', {
  messages: [Message.CapturedFiles],
  *handler() {
    const files = yield* InputFileResources

    return ({ element, viewStateChanges }) =>
      Stream.merge(
        files
          .observeFiles(element, viewStateChanges)
          .pipe(Stream.map((selected) => Message.CapturedFiles({ files: selected }))),
        viewStateChanges.pipe(
          Stream.switchMap((state) =>
            state === 'Live'
              ? Stream.callback<never>(() =>
                  Effect.acquireRelease(
                    Effect.sync(() => {
                      const input =
                        element instanceof HTMLInputElement
                          ? element
                          : element.querySelector('input')

                      if (!(input instanceof HTMLInputElement) || input.type !== 'number') {
                        return Function.constVoid
                      }

                      const click = (event: Event) => {
                        if (!(event.target instanceof Element)) {
                          return
                        }

                        const button = event.target.closest<HTMLButtonElement>('[data-input-step]')

                        if (button && element.contains(button)) {
                          stepNumberInput(input, button.dataset.inputStep === '1' ? 1 : -1)
                        }
                      }

                      element.addEventListener('click', click)
                      element.addEventListener('mousedown', preventNumberButtonFocus)

                      return () => {
                        element.removeEventListener('click', click)
                        element.removeEventListener('mousedown', preventNumberButtonFocus)
                      }
                    }),
                    (dispose) => Effect.sync(dispose),
                  ).pipe(Effect.flatMap(() => Effect.never)),
                )
              : Stream.never,
          ),
        ),
      )
  },
})

const InputComposition = InputBlock.makeComposition({ mounts: [ObserveInput] })

export interface InputConfig {
  readonly id: string
  readonly value: string
  readonly disabled?: boolean
  readonly readOnly?: boolean
}

export interface InputViewInputs extends Presentation {
  readonly type?: string
  readonly name?: string
  readonly placeholder?: string
  readonly invalid?: boolean
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const init = InputComposition.makeInit((config: InputConfig) => ({
  model: {
    ...config,
    disabled: config.disabled ?? false,
    readOnly: config.readOnly ?? false,
    inputRevision: 0,
    hasFile: false,
  },
}))

const update = InputComposition.makeUpdate({
  CapturedInput: (model, { value }) =>
    model.disabled || model.readOnly
      ? { model: modifyFields(model, { inputRevision: Number.increment }) }
      : {
          model: modifyFields(model, { inputRevision: Number.increment }),
          outMessage: OutMessage.Changed({ value }),
        },
  CapturedFiles: (model, { files }) => {
    if (files.length === 0 && !model.hasFile) {
      return { model }
    }

    return {
      model: modifyFields(model, { hasFile: () => files.length > 0 }),
      outMessage: OutMessage.FilesChanged({ files }),
    }
  },
})

const inMessageUpdate = InputComposition.makeInMessageUpdate({
  RequestedConfigure: (model, { value, disabled, readOnly }) => ({
    model: modifyFields(model, {
      value: () => value,
      disabled: () => disabled,
      readOnly: () => readOnly,
    }),
  }),
})

const view = InputComposition.makeView.withInputs<InputViewInputs>((model, inputs, h) => {
  const { size, shape, icons } = resolvePresentation(inputs)
  const compact = size.variant === 'compact'
  const type = inputs.type ?? 'text'
  const isFile = type === 'file'
  const isNumber = type === 'number'

  const config: Primitive.ViewConfig<typeof Message.Type> = {
    id: model.id,
    type,
    isDisabled: model.disabled,
    isReadOnly: model.readOnly,
    isInvalid: inputs.invalid ?? false,
    onInput: (value) => Message.CapturedInput({ value }),
    toView: (attributes) => {
      const input = formControlDefault(
        h.input(
          sourceStyleAttributes({ fontVariationSettings: fontWeights.normal }, [
            h.Class(
              cn(
                formControlClasses,
                shape.input,
                size.control,
                size.px,
                size.field,
                'file:mr-2 file:cursor-pointer file:border-0 file:bg-transparent file:p-0 file:font-[inherit] file:text-[length:inherit] file:text-foreground',
                isFile && (compact ? 'py-1 pl-7' : 'py-[7px] pl-9'),
                isFile && !model.hasFile && 'text-muted-foreground',
                isNumber &&
                  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                isNumber && (compact ? 'pr-[54px]' : 'pr-[68px]'),
                inputs.className,
              ),
            ),
            ...attributes.input,
            ...(isFile || isNumber ? [] : [h.OnMount(ObserveInput())]),
            h.DataAttribute('slot', 'input'),
            ...(inputs.attributes ?? []),
          ]),
        ),
        model.value,
      )

      if (!isFile && !isNumber) {
        return input
      }

      const stepButton = (direction: number) =>
        h.button(
          [
            h.Class(
              cn(
                'group/step flex shrink-0 cursor-pointer items-center justify-center text-muted-foreground outline-none transition-colors duration-80 hover:bg-hover hover:text-foreground disabled:pointer-events-none',
                compact ? 'size-6' : 'size-7',
              ),
            ),
            h.Type('button'),
            h.Tabindex(-1),
            h.AriaLabel(direction > 0 ? 'Increase' : 'Decrease'),
            h.Disabled(model.disabled || model.readOnly),
            h.DataAttribute('input-step', String(direction)),
            h.Style({
              borderRadius: `${nestedRadius(shape.bgRadius, compact ? 2 : 4)}px`,
            }),
          ],
          [(direction > 0 ? icons.plus : icons.minus)({ size: size.icon, strokeWidth: 1.5 }, h)],
        )

      return h.span(
        [
          h.OnMount(ObserveInput()),
          h.DataAttribute('slot', isFile ? 'input-file' : 'input-number'),
          h.Class('relative block w-full min-w-0'),
        ],
        [
          isFile
            ? icons.file(
                {
                  size: size.icon,
                  strokeWidth: 1.5,
                  className: cn(
                    'pointer-events-none absolute top-1/2 -translate-y-1/2 transition-colors duration-80',
                    compact ? 'left-2.5' : 'left-3',
                    model.hasFile ? 'text-foreground' : 'text-muted-foreground',
                  ),
                },
                h,
              )
            : null,
          input,
          isNumber
            ? h.span(
                [
                  h.Class('absolute inset-y-0 flex items-center'),
                  h.Style({ right: compact ? '2px' : '4px' }),
                ],
                [stepButton(-1), stepButton(1)],
              )
            : null,
        ],
      )
    },
  }

  let configured = config

  if (!isFile) {
    configured = { ...configured, value: model.value }
  }

  if (inputs.name !== undefined) {
    configured = { ...configured, name: inputs.name }
  }

  if (inputs.placeholder !== undefined) {
    configured = { ...configured, placeholder: inputs.placeholder }
  }

  return Primitive.view(configured, h)
})

export const layer = InputBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: ObserveInput.layer,
})

export {
  InputFileResources,
  InputFile,
  InputFileUnavailable,
  inputFileResourcesLayer,
  makeInputFileResourcesLayer,
} from './input-file-resources.js'

export type { InputFileRegistry } from './input-file-resources.js'
