import { fontWeights } from './lib/font-weight.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Effect, Option, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { IconName } from './icons.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import type { TargetMotionOptions } from './motion-target.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'

const Status = Schema.Literals(['complete', 'active', 'pending', 'upcoming', 'error'])
type Status = typeof Status.Type
export type ThinkingStepStatus = Status

const Model = Schema.Struct({
  id: Schema.String,
  status: Status,
  height: Schema.OptionFromNullOr(Schema.Finite),
})

const Message = defineMessageUnion({ Measured: { height: Schema.Finite } })

const InMessage = defineInMessageUnion({ RequestedConfigure: { status: Status } })

export const ThinkingStepKey = Symbol('FluidThinkingStep')

const effects = Block.makeEffectsContract()

export const ThinkingStepBlock = Block.make('ThinkingStep', {
  key: ThinkingStepKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({ id: Schema.String, status: Schema.optionalKey(Status) }),
  ]),
  Model,
  Message,
  InMessage,
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<ThinkingStepViewInputs>() },
})

const Observe = ThinkingStepBlock.makeMountStream('MeasureThinkingStep', {
  messages: [Message.Measured],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.Measured.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    if (!(element instanceof HTMLElement)) {
                      throw new Error('Thinking step requires HTMLElement')
                    }

                    const measure = () => {
                      if (element.offsetHeight > 0) {
                        Queue.offerUnsafe(queue, Message.Measured({ height: element.offsetHeight }))
                      }
                    }

                    const observer = new ResizeObserver(measure)
                    observer.observe(element)
                    measure()

                    return () => {
                      observer.disconnect()
                    }
                  }),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})

const ThinkingStepComposition = ThinkingStepBlock.makeComposition({ mounts: [Observe] })

export interface ThinkingStepConfig {
  readonly id: string
  readonly status?: ThinkingStepStatus
}

const init = ThinkingStepComposition.makeInit((config: ThinkingStepConfig) => ({
  model: Model.make({ id: config.id, status: config.status ?? 'complete', height: Option.none() }),
}))

const update = ThinkingStepComposition.makeUpdate({
  Measured: (model, { height }) => ({
    model: height > 0 ? modifyFields(model, { height: () => Option.some(height) }) : model,
  }),
})

export interface ThinkingStepViewInputs extends Presentation {
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  readonly label: string
  readonly description?: string
  readonly meta?: () => Html | string
  readonly href?: string
  readonly icon?: IconName
  readonly showIcon?: boolean
  readonly delay?: number
  readonly isLast?: boolean
  readonly children?: () => ReadonlyArray<Html | string>
  readonly className?: string
}

const view = ThinkingStepComposition.makeView.withInputs<ThinkingStepViewInputs>(
  (model, inputs, h) => {
    if (model.status === 'pending') {
      return h.empty
    }

    const { shape, size, icons } = resolvePresentation(inputs)
    const isUpcoming = model.status === 'upcoming'
    const isError = model.status === 'error'
    const safeHref =
      inputs.href && /^(https?:\/\/|\/(?!\/))/i.test(inputs.href) ? inputs.href : undefined
    const labelClass = cn(
      size.type.body,
      isError ? 'text-destructive' : isUpcoming ? 'text-muted-foreground' : 'text-foreground',
      model.status === 'active' && 'shimmer-text',
      'min-w-0',
    )
    const labelStyle = {
      fontVariationSettings: isUpcoming ? fontWeights.normal : fontWeights.semibold,
    }
    const label = [inputs.label, model.status === 'active' ? '…' : '']

    return inputs.animate(
      h.div(
        [h.Id(model.id), h.Class(cn('relative z-10 overflow-hidden', inputs.className))],
        [
          inputs.animate(
            h.div(
              [h.OnMount(Observe())],
              [
                h.div(
                  [h.Class(cn('flex gap-2.5 px-2 py-1.5', shape.item))],
                  [
                    h.div(
                      [h.Class('flex flex-col items-center shrink-0 w-[14px]')],
                      [
                        h.div(
                          [h.Class('pt-0.5')],
                          [
                            inputs.showIcon === false
                              ? h.div(
                                  [h.Class('w-[14px] h-[14px] flex items-center justify-center')],
                                  [
                                    h.div([
                                      h.Class('w-1.5 h-1.5 rounded-full bg-muted-foreground/60'),
                                    ]),
                                  ],
                                )
                              : icons[inputs.icon ?? 'dot'](
                                  {
                                    size: size.variant === 'compact' ? 12 : 14,
                                    strokeWidth: 1.5,
                                    className: isError
                                      ? 'text-destructive'
                                      : isUpcoming
                                        ? 'text-muted-foreground opacity-60'
                                        : 'text-muted-foreground',
                                  },
                                  h,
                                ),
                          ],
                        ),
                        inputs.isLast === true
                          ? h.empty
                          : h.div([h.Class('flex-1 w-px bg-border/60 mt-1')]),
                      ],
                    ),
                    h.div(
                      [h.Class('flex-1 flex flex-col gap-1 min-w-0')],
                      [
                        h.span(
                          [h.Class('flex items-baseline gap-2')],
                          [
                            safeHref === undefined
                              ? h.span([h.Class(labelClass), h.Style(labelStyle)], label)
                              : h.a(
                                  [
                                    h.Href(safeHref),
                                    h.Target('_blank'),
                                    h.Rel('noreferrer'),
                                    h.Class(
                                      cn(
                                        labelClass,
                                        'rounded-sm underline-offset-2 outline-none hover:underline',
                                        'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                                      ),
                                    ),
                                    h.Style(labelStyle),
                                  ],
                                  [
                                    ...label,
                                    h.span([h.Class('sr-only')], [' (opens in a new tab)']),
                                  ],
                                ),
                            ...(inputs.meta === undefined
                              ? []
                              : [
                                  h.span(
                                    [
                                      h.Class(
                                        cn(
                                          size.type.body,
                                          'shrink-0 tabular-nums text-muted-foreground',
                                        ),
                                      ),
                                    ],
                                    [inputs.meta()],
                                  ),
                                ]),
                          ],
                        ),
                        inputs.description !== undefined && inputs.description !== ''
                          ? h.span(
                              [h.Class(cn(size.type.body, 'text-muted-foreground'))],
                              [inputs.description],
                            )
                          : h.empty,
                        ...(inputs.children?.() ?? []),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.24, delay: inputs.delay ?? 0.08, ease: 'easeOut' },
            },
          ),
        ],
      ),
      {
        initial: { height: 0 },
        animate: { height: Option.getOrElse(model.height, () => 0) },
        transition: spring.slow,
      },
    )
  },
)

const inMessageUpdate = ThinkingStepComposition.makeInMessageUpdate({
  RequestedConfigure: (model, { status }) => ({
    model: modifyFields(model, { status: () => status }),
  }),
})

export const layer = ThinkingStepBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Observe.layer,
})

export const test = { Observe }
