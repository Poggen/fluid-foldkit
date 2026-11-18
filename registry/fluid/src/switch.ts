import { sourceStyleAttributes } from './lib/source-style-attributes.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { defineSwitchPointer } from './switch-pointer'
import * as Primitive from '@foldkit/ui/switch'
import { Effect, Layer, Match, Option, Schema, Number } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { cn } from './lib/utils.js'
import { spring } from './lib/springs.js'
import type { MotionOptions } from './motion.js'
import type { SwitchAnimation } from './switch-motion.js'
import { keepSwitchInputDefault } from './switch-input.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'

export const switchViewInputs: (props: SwitchProps) => SwitchViewInputs = function switchViewInputs(
  props: SwitchProps,
) {
  const { thumbTransition, ...rest } = props

  return thumbTransition === undefined
    ? rest
    : { ...rest, getThumbTransition: () => thumbTransition }
}

export const switchMetrics = {
  default: { trackWidth: 34, trackHeight: 20, thumbSize: 16, pressExtend: 4, pressShrink: 4 },
  compact: { trackWidth: 28, trackHeight: 16, thumbSize: 12, pressExtend: 3, pressShrink: 3 },
}

const Pointer = Schema.Struct({
  id: Schema.Finite,
  start: Schema.Finite,
  origin: Schema.Finite,
  maximum: Schema.Finite,
})

const Model = Schema.Struct({
  id: Schema.String,
  checked: Schema.Boolean,
  initialChecked: Schema.Boolean,
  disabled: Schema.Boolean,
  hovered: Schema.Boolean,
  pressed: Schema.Boolean,
  pointer: Schema.OptionFromNullOr(Pointer),
  dragging: Schema.Boolean,
  dragX: Schema.Finite,
  suppressClick: Schema.Boolean,
  generation: Schema.Natural,
})

const Message = defineMessageUnion({
  CapturedToggle: {},
  CapturedMount: {},
  CapturedHover: { hovered: Schema.Boolean },
  CapturedDown: { ...Pointer.fields },
  CapturedMove: { id: Schema.Finite, clientX: Schema.Finite },
  CapturedUp: { id: Schema.Finite, cancelled: Schema.Boolean },
  ReleasedClick: { generation: Schema.Natural },
})

const OutMessage = defineMessageUnion({ Toggled: {} })

export interface SwitchConfig {
  readonly id: string
  readonly checked: boolean
  readonly disabled?: boolean
}

export interface SwitchProps extends Presentation {
  readonly layout?: 'inline' | 'settings-row'
  readonly label: string
  readonly thumbTransition?: MotionOptions['transition']
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly animate: (node: Html, animation: SwitchAnimation) => Html
}

export interface SwitchViewInputs extends Omit<SwitchProps, 'thumbTransition'> {
  readonly getThumbTransition?: () => NonNullable<MotionOptions['transition']>
}

const Config = Schema.Struct({
  id: Schema.String,
  checked: Schema.Boolean,
  disabled: Schema.optionalKey(Schema.Boolean),
})

const InMessage = defineInMessageUnion({
  RequestedConfigure: { checked: Schema.Boolean, disabled: Schema.Boolean },
  RequestedToggle: {},
})

const effects = Block.makeEffectsContract()

export const SwitchKey = Symbol('Switch')

export const SwitchBlock = Block.make('Switch', {
  key: SwitchKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<SwitchViewInputs>() },
  inMessageOutputs: { RequestedToggle: { outMessage: OutMessage.Toggled } },
  effects,
})

const ReleaseClick = SwitchBlock.makeCommand('ReleaseClick', {
  args: { generation: Schema.Natural },
  messages: [Message.ReleasedClick],
  *handler() {
    return ({ generation }) =>
      Effect.callback<typeof Message.ReleasedClick.Type>((resume) => {
        const frame = requestAnimationFrame(() => {
          resume(Effect.succeed(Message.ReleasedClick({ generation })))
        })

        return Effect.sync(() => {
          cancelAnimationFrame(frame)
        })
      })
  },
})

const ObservePointer = defineSwitchPointer(SwitchBlock, switchMetrics)

const SwitchComposition = SwitchBlock.makeComposition({
  mounts: [ObservePointer],
})

const init = SwitchComposition.makeInit((config: SwitchConfig) => ({
  model: Model.make({
    ...config,
    initialChecked: config.checked,
    disabled: config.disabled ?? false,
    hovered: false,
    pressed: false,
    pointer: Option.none(),
    dragging: false,
    dragX: 2,
    suppressClick: false,
    generation: 0,
  }),
}))

const inMessageUpdate = SwitchComposition.makeInMessageUpdate({
  RequestedConfigure: (model, { checked, disabled }) => ({
    model: modifyFields(model, { checked: () => checked, disabled: () => disabled }),
  }),
  RequestedToggle: (model) =>
    model.disabled || model.suppressClick ? { model } : { model, outMessage: OutMessage.Toggled() },
})

const update = SwitchComposition.makeUpdate({
  CapturedToggle: (model) =>
    model.disabled || model.suppressClick ? { model } : { model, outMessage: OutMessage.Toggled() },
  CapturedHover: (model, { hovered }) => ({
    model: modifyFields(model, { hovered: () => hovered }),
  }),
  CapturedDown: (model, pointer) => ({
    model: model.disabled
      ? model
      : modifyFields(model, {
          pressed: () => true,
          pointer: () => Option.some(pointer),
          dragging: () => false,
          suppressClick: () => false,
        }),
  }),
  CapturedMove: (model, { clientX }) => {
    if (Option.isNone(model.pointer)) {
      return { model }
    }

    const pointer = model.pointer.value
    const delta = clientX - pointer.start

    if (!model.dragging && Math.abs(delta) < 2) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        dragging: () => true,
        dragX: () => Math.max(2, Math.min(pointer.maximum, pointer.origin + delta)),
      }),
    }
  },
  CapturedUp: (model, { cancelled }) => {
    if (Option.isNone(model.pointer)) {
      return { model }
    }

    const toggle =
      !cancelled &&
      model.dragging &&
      model.dragX > (2 + model.pointer.value.maximum) / 2 !== model.checked

    const result = {
      model: modifyFields(model, {
        pressed: () => false,
        pointer: () => Option.none(),
        dragging: () => false,
        suppressClick: () => model.dragging && !cancelled,
        generation: Number.increment,
      }),
      commands:
        model.dragging && !cancelled ? [ReleaseClick({ generation: model.generation + 1 })] : [],
    }

    return toggle ? { ...result, outMessage: OutMessage.Toggled() } : result
  },
  CapturedMount: (model) => ({
    model: modifyFields(model, {
      initialChecked: () => model.checked,
      hovered: () => false,
      pressed: () => false,
      pointer: () => Option.none(),
      dragging: () => false,
      suppressClick: () => false,
      generation: Number.increment,
    }),
  }),
  ReleasedClick: (model, { generation }) => ({
    model:
      generation === model.generation ? modifyFields(model, { suppressClick: () => false }) : model,
  }),
})

const view = SwitchComposition.makeView.withInputs((model, inputs, h) => {
  const presentation = resolvePresentation(inputs)
  const transition = inputs.getThumbTransition?.() ?? spring.moderate
  const trackElement = h.span
  const stateAttributes = model.checked ? [h.DataAttribute('checked', '')] : []
  const round = presentation.shape.variant === 'sharp' ? 'rounded-none' : 'rounded-full'
  const { size } = presentation
  const metrics = switchMetrics[size.variant]
  const hoverGrowth = model.hovered ? 2 : 0
  const width = metrics.thumbSize + (model.pressed ? metrics.pressExtend : hoverGrowth)
  const restingX = model.checked ? metrics.trackWidth - 2 - width : 2
  const x = model.dragging ? model.dragX : restingX
  const y = model.pressed ? 2 + metrics.pressShrink / 2 : 2
  const height = model.pressed ? metrics.thumbSize - metrics.pressShrink : metrics.thumbSize

  const checkedBackground = model.hovered
    ? 'color-mix(in oklab, var(--fluid-accent, #6B97FF), black 8%)'
    : 'var(--fluid-accent, #6B97FF)'

  const uncheckedBackground = model.hovered
    ? 'color-mix(in oklab, var(--accent), rgb(var(--overlay)) 10%)'
    : 'var(--accent)'

  const backgroundColor = model.checked ? checkedBackground : uncheckedBackground

  return Primitive.view(
    {
      id: model.id,
      isChecked: model.checked,
      isDisabled: model.disabled,
      onToggle: () => Message.CapturedToggle(),
      toView: (attributes) =>
        h.div(
          [
            h.Id(model.id),
            h.OnMount(ObservePointer()),
            h.DataAttribute('slot', 'switch'),
            h.Class(
              cn(
                'relative z-10 flex items-center cursor-pointer select-none touch-none',
                size.gap,
                inputs.layout === 'settings-row'
                  ? 'flex-row-reverse justify-between px-2 min-h-7'
                  : size.px,
                size.variant === 'compact' ? 'py-1' : 'py-2',
                model.disabled && 'opacity-50 pointer-events-none',
                inputs.className,
              ),
            ),
            ...(inputs.attributes ?? []),
          ],
          [
            trackElement(
              sourceStyleAttributes(
                {
                  width: `${metrics.trackWidth}px`,
                  height: `${metrics.trackHeight}px`,
                  backgroundColor: backgroundColor,
                },
                [
                  h.Class(
                    `relative shrink-0 ${round} outline-none cursor-pointer transition-colors duration-80 focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] focus-visible:ring-offset-2 focus-visible:ring-offset-background`,
                  ),
                  ...attributes.button.filter((attribute) =>
                    Match.value(attribute).pipe(
                      Match.tag('Type', () => false),
                      Match.orElse(() => true),
                    ),
                  ),
                  h.Tabindex(model.disabled ? -1 : 0),
                  h.DataAttribute('slot', 'switch-track'),
                  ...stateAttributes,
                ],
              ),
              [
                inputs.animate(
                  h.span([
                    h.Class(`absolute top-0 left-0 block ${round} bg-white shadow-sm`),
                    h.DataAttribute('slot', 'switch-thumb'),
                    ...(model.disabled ? [h.DataAttribute('disabled', '')] : []),
                    ...stateAttributes,
                    h.Style({
                      width: `${width}px`,
                      height: `${height}px`,
                      transform: `translateX(${x}px) translateY(${y}px)`,
                    }),
                  ]),
                  {
                    x,
                    y,
                    width,
                    height,
                    dragging: model.dragging,
                    reducedMotion: presentation.reducedMotion,
                    transition,
                  },
                ),
              ],
            ),
            keepSwitchInputDefault(
              h.input([
                h.Type('checkbox'),
                h.Checked(model.checked),
                h.Disabled(model.disabled),
                h.Tabindex(-1),
                h.AriaHidden(true),
                h.Class(
                  'fixed top-0 left-0 [border:0] w-px h-px p-0 m-0 overflow-hidden [clip-path:inset(50%)] whitespace-nowrap',
                ),
              ]),
              model.initialChecked,
            ),
            h.span(
              [
                h.Id(Primitive.labelId(model.id)),
                h.Class(
                  cn(
                    '[text-box:trim-both_cap_alphabetic] transition-[color] duration-80',
                    size.text,
                    model.checked ? 'text-foreground' : 'text-muted-foreground',
                  ),
                ),
              ],
              [inputs.label],
            ),
          ],
        ),
    },
    h,
  )
})

export const SwitchLayer = SwitchBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(ObservePointer.layer, ReleaseClick.layer),
})

export { createSwitchMotionScope } from './switch-motion.js'

export type { SwitchAnimation } from './switch-motion.js'

export const test = { ReleaseClick, ObservePointer }
