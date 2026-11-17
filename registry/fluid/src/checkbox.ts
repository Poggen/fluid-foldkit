// Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Checkbox } from '@foldkit/ui'
import { Data, Effect, Function, Option, Predicate, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import type { TargetMotionOptions } from './motion-target.js'
import { EXIT_COMPLETE_EVENT } from './motion-target.js'
import { keepSwitchInputDefault } from './switch-input.js'
import { preserveCheckboxReset } from './checkbox-group-input.js'

const Glyph = Schema.Literals(['check', 'dash'])
type Glyph = typeof Glyph.Type
const Mark = Schema.Union([
  Schema.TaggedStruct('Empty', { generation: Schema.Natural }),
  Schema.TaggedStruct('Present', { glyph: Glyph, generation: Schema.Natural }),
  Schema.TaggedStruct('Exiting', { glyph: Glyph, generation: Schema.Natural }),
])
type Mark = typeof Mark.Type
const glyphFor = (checked: boolean, indeterminate: boolean): Glyph | undefined =>
  indeterminate ? 'dash' : checked ? 'check' : undefined

const configureMark = (mark: Mark, glyph: Glyph | undefined): Mark => {
  if (glyph !== undefined) {
    return mark._tag === 'Present' && mark.glyph === glyph
      ? mark
      : { _tag: 'Present', glyph, generation: mark.generation + 1 }
  }
  return mark._tag === 'Present'
    ? { _tag: 'Exiting', glyph: mark.glyph, generation: mark.generation + 1 }
    : mark
}

const Model = Schema.Struct({
  id: Schema.String,
  checked: Schema.Boolean,
  indeterminate: Schema.Boolean,
  initialChecked: Schema.Boolean,
  disabled: Schema.Boolean,
  readOnly: Schema.Boolean,
  mark: Mark,
  entering: Schema.Boolean,
})

const Message = defineMessageUnion({
  Toggled: { checked: Schema.Boolean },
  CompletedExit: { generation: Schema.Natural },
})

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const OutMessage = defineMessageUnion({ Changed: { checked: Schema.Boolean } })

const InMessage = defineInMessageUnion({
  RequestedConfigure: {
    checked: Schema.Boolean,
    indeterminate: Schema.optionalKey(Schema.Boolean),
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
  },
})

const Config = Schema.Struct({
  id: Schema.String,
  checked: Schema.Boolean,
  indeterminate: Schema.optionalKey(Schema.Boolean),
  disabled: Schema.optionalKey(Schema.Boolean),
  readOnly: Schema.optionalKey(Schema.Boolean),
})

const effects = Block.makeEffectsContract()

export const CheckboxKey = Symbol('Checkbox')

export const CheckboxBlock = Block.make('Checkbox', {
  key: CheckboxKey,
  Model,
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<CheckboxViewInputs>() },
  effects,
})

const ObserveControl = CheckboxBlock.makeMountStream('ObserveControl', {
  messages: [Message.Toggled],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.Toggled.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const control = element.querySelector<HTMLElement>('[data-slot=checkbox]')
                    const input = element.querySelector('input')

                    if (!control || !input) {
                      return Function.constVoid
                    }

                    const key = (event: Event) => {
                      if (!(event instanceof KeyboardEvent)) {
                        return
                      }

                      if (event.key !== 'Enter' || event.target !== control || event.repeat) {
                        return
                      }

                      event.preventDefault()

                      if (
                        control.getAttribute('aria-disabled') === 'true' ||
                        control.getAttribute('aria-readonly') === 'true'
                      ) {
                        return
                      }

                      const card = control.closest('[data-slot=field-label]')

                      if (card?.querySelector(':scope > [data-slot=field]')) {
                        control.click()
                      } else {
                        input.form?.requestSubmit()
                      }
                    }

                    const invalid = (event: Event) => {
                      event.preventDefault()
                      control.focus()
                    }

                    input.addEventListener('invalid', invalid)
                    let live = true

                    const reset = (event: Event) => {
                      queueMicrotask(() => {
                        if (live && !event.defaultPrevented) {
                          Queue.offerUnsafe(
                            queue,
                            Message.Toggled({ checked: input.defaultChecked }),
                          )
                        }
                      })
                    }

                    element.addEventListener('keydown', key)
                    input.form?.addEventListener('reset', reset)

                    return () => {
                      live = false
                      input.removeEventListener('invalid', invalid)
                      element.removeEventListener('keydown', key)
                      input.form?.removeEventListener('reset', reset)
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

const CheckboxComposition = CheckboxBlock.makeComposition({ mounts: [ObserveControl] })

export interface CheckboxConfig {
  readonly id: string
  readonly checked: boolean
  readonly indeterminate?: boolean
  readonly disabled?: boolean
  readonly readOnly?: boolean
}

export interface CheckboxViewInputs extends Presentation {
  readonly label?: string
  readonly form?: string
  readonly name?: string
  readonly value?: string
  readonly required?: boolean
  readonly invalid?: boolean
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
}

const init = CheckboxComposition.makeInit((config: CheckboxConfig) => {
  const glyph = glyphFor(config.checked, config.indeterminate ?? false)
  return {
    model: {
      ...config,
      indeterminate: config.indeterminate ?? false,
      initialChecked: config.checked,
      disabled: config.disabled ?? false,
      readOnly: config.readOnly ?? false,
      mark:
        glyph === undefined
          ? { _tag: 'Empty', generation: 0 }
          : { _tag: 'Present', glyph, generation: 0 },
      entering: false,
    },
  }
})

const update = CheckboxComposition.makeUpdate({
  Toggled: (model, { checked }) =>
    model.disabled || model.readOnly
      ? { model }
      : { model, outMessage: OutMessage.Changed({ checked }) },
  CompletedExit: (model, { generation }) => ({
    model:
      generation === model.mark.generation && model.mark._tag === 'Exiting'
        ? modifyFields(model, { mark: () => ({ _tag: 'Empty', generation }) })
        : model,
  }),
})

const inMessageUpdate = CheckboxComposition.makeInMessageUpdate({
  RequestedConfigure: (model, { checked, disabled, readOnly, indeterminate = false }) => {
    const glyph = glyphFor(checked, indeterminate)
    const mark = configureMark(model.mark, glyph)
    return {
      model: modifyFields(model, {
        checked: () => checked,
        indeterminate: () => indeterminate,
        disabled: () => disabled,
        readOnly: () => readOnly,
        mark: () => mark,
        entering: () => mark._tag === 'Present' && mark !== model.mark,
      }),
    }
  },
})

const view = CheckboxComposition.makeView.withInputs<CheckboxViewInputs>((model, inputs, h) => {
  const { size, shape, reducedMotion } = resolvePresentation(inputs)
  const compact = size.variant === 'compact'
  const rounded = compact ? 'rounded-[4px]' : 'rounded-[5px]'

  return Checkbox.view(
    {
      id: model.id,
      isChecked: model.checked,
      isIndeterminate: model.indeterminate,
      isDisabled: model.disabled,
      isReadOnly: model.readOnly,
      onToggle: (checked) => Message.Toggled({ checked }),
      toView: (attributes) =>
        h.span(
          [h.Class('contents'), h.OnMount(ObserveControl())],
          [
            h.button(
              [
                ...attributes.checkbox.filter(
                  (attribute) =>
                    inputs.label !== undefined || !Predicate.isTagged(attribute, 'AriaLabelledBy'),
                ),
                h.Id(model.id),
                h.DataAttribute('slot', 'checkbox'),
                ...(inputs.required === true ? [h.AriaRequired(true)] : []),
                ...(inputs.invalid === true ? [h.AriaInvalid(true)] : []),
                h.Disabled(model.disabled),
                h.Class(
                  cn(
                    'relative inline-block shrink-0 cursor-pointer border-[1.5px] border-solid border-border bg-transparent p-0 outline-none transition-[border-color] duration-80 hover:not-data-checked:border-foreground/40 group-hover/field:not-data-checked:border-foreground/40 data-checked:border-transparent data-indeterminate:border-transparent hover:data-checked:border-foreground/40 group-hover/field:not-data-disabled:data-checked:border-foreground/40 aria-invalid:not-data-checked:border-destructive/50 focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] data-disabled:pointer-events-none data-disabled:opacity-50',
                    compact ? 'size-[14px]' : 'size-4',
                    shape.variant === 'sharp' ? 'rounded-none' : rounded,
                    inputs.className,
                  ),
                ),
                ...(inputs.attributes ?? []),
              ],
              [
                model.mark._tag !== 'Empty'
                  ? h.svg(
                      [
                        h.Width(compact ? '16' : '18'),
                        h.Height(compact ? '16' : '18'),
                        h.ViewBox('0 0 24 24'),
                        h.Fill('none'),
                        h.Stroke('currentColor'),
                        h.StrokeWidth('2'),
                        h.StrokeLinecap('round'),
                        h.StrokeLinejoin('round'),
                        h.AriaHidden(true),
                        h.Class(
                          'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground',
                        ),
                      ],
                      [
                        inputs.animate(
                          h.path([
                            h.Key(model.mark.glyph),
                            h.D(model.mark.glyph === 'dash' ? 'M7 12H17' : 'M6 12L10 16L18 8'),
                            Events.OnCustomEvent({
                              name: EXIT_COMPLETE_EVENT,
                              f: () =>
                                Option.some(
                                  Message.CompletedExit({ generation: model.mark.generation }),
                                ),
                            }),
                          ]),
                          {
                            initial: model.entering ? { pathLength: 0 } : false,
                            animate: {
                              pathLength: 1,
                              transition: { duration: 0.08, ease: 'easeOut' },
                            },
                            exit: { pathLength: 0, transition: { duration: 0.04, ease: 'easeIn' } },
                            present: model.mark._tag === 'Present',
                            reducedMotion,
                          },
                        ),
                      ],
                    )
                  : null,
              ],
            ),
            inputs.label === undefined
              ? null
              : h.span([h.Id(Checkbox.labelId(model.id)), h.Class('sr-only')], [inputs.label]),
            preserveCheckboxReset(
              keepSwitchInputDefault(
                h.input([
                  h.Type('checkbox'),
                  h.Checked(model.checked),
                  h.Disabled(model.disabled),
                  h.Required(inputs.required ?? false),
                  ...(inputs.form === undefined ? [] : [h.Attribute('form', inputs.form)]),
                  h.Tabindex(-1),
                  h.AriaHidden(true),
                  ...(inputs.name === undefined ? [] : [h.Name(inputs.name)]),
                  h.Value(inputs.value ?? 'on'),
                  h.Class('sr-only pointer-events-none'),
                ]),
                model.initialChecked,
              ),
              model.checked,
              true,
            ),
          ],
        ),
    },
    h,
  )
})

export const layer = CheckboxBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: ObserveControl.layer,
})

export const test = { ObserveControl }
