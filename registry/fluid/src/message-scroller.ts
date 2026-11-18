/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
import { Effect, Layer, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { createMotionScope } from './motion.js'
import type { MotionScope } from './motion.js'
import type { Presentation } from './presentation.js'
import { resolvePresentation } from './presentation.js'
import { spring } from './lib/springs.js'
import { observeMessageScroller } from './message-scroller-observer.js'

const Config = Schema.Struct({
  id: Schema.String,
  autoScroll: Schema.optionalKey(Schema.Boolean),
  peek: Schema.optionalKey(Schema.Finite),
})
export type MessageScrollerConfig = typeof Config.Type
const Message = defineMessageUnion({
  ObservedPosition: { atEnd: Schema.Boolean, following: Schema.Boolean },
  ButtonExited: { generation: Schema.Natural },
})
const InMessage = defineInMessageUnion({
  RequestedScrollToEnd: {},
  RequestedConfigure: { autoScroll: Schema.Boolean, peek: Schema.Finite },
})
const OutMessage = defineMessageUnion({
  PositionChanged: { atEnd: Schema.Boolean, following: Schema.Boolean },
})
export interface MessageScrollerViewInputs extends Presentation {
  readonly content: () => ReadonlyArray<Html>
  readonly className?: string
  readonly viewportClassName?: string
  readonly contentClassName?: string
  readonly label?: string
  readonly busy?: boolean
  readonly showButton?: boolean
  readonly buttonLabel?: string
  readonly animate?: MotionScope['node']
}
const effects = Block.makeEffectsContract<never, never>()
export const MessageScrollerKey = Symbol('MessageScroller')
export const MessageScrollerBlock = Block.make('MessageScroller', {
  key: MessageScrollerKey,
  InitArgs: Schema.Tuple([Config]),
  Model: Schema.Struct({
    id: Schema.String,
    autoScroll: Schema.Boolean,
    peek: Schema.Finite,
    atEnd: Schema.Boolean,
    following: Schema.Boolean,
    request: Schema.Natural,
    buttonPresent: Schema.Boolean,
    buttonGeneration: Schema.Natural,
  }),
  Message,
  InMessage,
  OutMessage,
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<MessageScrollerViewInputs>() },
})
const Observe = MessageScrollerBlock.makeMountStream('Observe', {
  messages: [Message.ObservedPosition, Message.ButtonExited],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<
                typeof Message.ObservedPosition.Type | typeof Message.ButtonExited.Type
              >((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() =>
                    observeMessageScroller(element, {
                      position: (atEnd, following) => {
                        Queue.offerUnsafe(queue, Message.ObservedPosition({ atEnd, following }))
                      },
                      buttonExited: (generation) => {
                        Queue.offerUnsafe(queue, Message.ButtonExited({ generation }))
                      },
                    }),
                  ),
                  (release) => Effect.sync(release),
                ),
              )
            : Stream.empty,
        ),
      )
  },
})
const MessageScrollerComposition = MessageScrollerBlock.makeComposition({ mounts: [Observe] })
const init = MessageScrollerComposition.makeInit((config: MessageScrollerConfig) => ({
  model: {
    id: config.id,
    autoScroll: config.autoScroll ?? true,
    peek: Math.max(0, config.peek ?? 16),
    atEnd: true,
    following: true,
    request: 0,
    buttonPresent: false,
    buttonGeneration: 0,
  },
}))
const update = MessageScrollerComposition.makeUpdate({
  ObservedPosition: (model, { atEnd, following }) => ({
    model: {
      ...model,
      atEnd,
      following,
      buttonPresent: model.buttonPresent || !atEnd,
      buttonGeneration: model.buttonGeneration + (model.atEnd === atEnd ? 0 : 1),
    },
    outMessage: OutMessage.PositionChanged({ atEnd, following }),
  }),
  ButtonExited: (model, { generation }) => ({
    model:
      model.atEnd && generation === model.buttonGeneration
        ? { ...model, buttonPresent: false }
        : model,
  }),
})
const inMessageUpdate = MessageScrollerComposition.makeInMessageUpdate({
  RequestedScrollToEnd: (model) => ({ model: { ...model, request: model.request + 1 } }),
  RequestedConfigure: (model, { autoScroll, peek }) => ({
    model: { ...model, autoScroll, peek: Math.max(0, peek) },
  }),
})
const makeView = (motion: MotionScope) =>
  MessageScrollerComposition.makeView.withInputs((model, inputs, h) => {
    const presentation = resolvePresentation(inputs)
    const animate = inputs.animate ?? motion.node
    return h.div(
      [
        h.Id(model.id),
        h.Class(`relative flex min-h-0 flex-col ${inputs.className ?? ''}`),
        h.DataAttribute('slot', 'message-scroller'),
        h.DataAttribute('message-auto-scroll', String(model.autoScroll)),
        h.DataAttribute('message-peek', String(model.peek)),
        h.DataAttribute(
          'message-reduced-motion',
          inputs.context === undefined ? 'user' : presentation.reducedMotion,
        ),
        h.DataAttribute('message-scroll-request', String(model.request)),
        h.OnMount(Observe()),
      ],
      [
        animate(
          h.div(
            [
              h.Role('region'),
              h.AriaLabel(inputs.label ?? 'Conversation'),
              h.Tabindex(0),
              h.DataAttribute('message-viewport', ''),
              h.Class(
                `relative min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none [overflow-anchor:none] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--focus-ring,#6B97FF)] ${inputs.viewportClassName ?? ''}`,
              ),
            ],
            [
              MessageScrollerContent(
                {
                  children: inputs.content(),
                  busy: inputs.busy ?? false,
                  className: inputs.contentClassName ?? '',
                },
                h,
              ),
              h.div([
                h.AriaHidden(true),
                h.DataAttribute('message-spacer', ''),
                h.Class('shrink-0'),
              ]),
            ],
          ),
          { layoutScroll: true, animate: {} },
        ),
        inputs.showButton === false
          ? null
          : MessageScrollerButton(
              {
                ...inputs,
                atEnd: model.atEnd,
                retained: model.buttonPresent,
                generation: model.buttonGeneration,
                animate,
                label: inputs.buttonLabel ?? 'Scroll to latest',
                className: '',
              },
              h,
            ),
      ],
    )
  })
export const layer = MessageScrollerBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* MessageScrollerComposition.acquireChildren()
    const motion = createMotionScope('MessageScroller')
    yield* Layer.build(motion.layer)
    return {
      children,
      init,
      update,
      inMessageUpdate,
      view: makeView(motion),
      EffectsLayer: Observe.layer,
    }
  }),
)
export const MessageScrollerLayer = layer
export interface MessageScrollerItemProps {
  readonly anchor?: boolean
  readonly className?: string
  readonly children: ReadonlyArray<Html | string>
  readonly attributes?: ReadonlyArray<ChildAttribute>
}
export const MessageScrollerItem: <M>(props: MessageScrollerItemProps, h: HtmlBuilder<M>) => Html =
  function MessageScrollerItem<M>(props: MessageScrollerItemProps, h: HtmlBuilder<M>) {
    return h.div(
      [
        h.Class(`flex flex-col ${props.className ?? ''}`),
        ...(props.anchor === true ? [h.DataAttribute('message-anchor', '')] : []),
        ...(props.attributes ?? []),
      ],
      props.children,
    )
  }

export interface MessageScrollerContentProps {
  readonly children: ReadonlyArray<Html | string>
  readonly busy?: boolean
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}
export const MessageScrollerContent: <M>(
  props: MessageScrollerContentProps,
  h: HtmlBuilder<M>,
) => Html = function MessageScrollerContent<M>(
  props: MessageScrollerContentProps,
  h: HtmlBuilder<M>,
) {
  return h.div(
    [
      h.Role('log'),
      h.AriaBusy(props.busy ?? false),
      h.DataAttribute('message-content', ''),
      h.Class(`flex flex-col ${props.className ?? ''}`),
      ...(props.attributes ?? []),
    ],
    props.children,
  )
}
export interface MessageScrollerButtonProps extends Presentation {
  readonly atEnd: boolean
  readonly retained?: boolean
  readonly generation?: number
  readonly animate: MotionScope['node']
  readonly label?: string
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}
export const MessageScrollerButton: <M>(
  props: MessageScrollerButtonProps,
  h: HtmlBuilder<M>,
) => Html | null = function MessageScrollerButton<M>(
  props: MessageScrollerButtonProps,
  h: HtmlBuilder<M>,
) {
  if (!(props.retained ?? !props.atEnd)) return null
  const presentation = resolvePresentation(props)
  const compact = presentation.size.variant === 'compact'
  return props.animate(
    h.div(
      [
        h.Key('latest'),
        h.DataAttribute('message-button-generation', String(props.generation ?? 0)),
        h.Class('pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center'),
      ],
      [
        h.button(
          [
            h.Type('button'),
            h.AriaLabel(props.label ?? 'Scroll to latest'),
            h.DataAttribute('message-jump', ''),
            h.Class(
              `pointer-events-auto grid cursor-pointer place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-sm outline-none transition-[color,background-color,scale] duration-80 hover:bg-hover hover:text-foreground active:scale-[0.96] focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] ${compact ? 'size-7' : 'size-9'} ${props.className ?? ''}`,
            ),
            ...(props.attributes ?? []),
          ],
          [presentation.icons['arrow-down']({ size: compact ? 14 : 16, strokeWidth: 1.5 }, h)],
        ),
      ],
    ),
    {
      initial: { opacity: 0, scale: 0.9, y: 4 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.9, y: 4, transition: spring.moderate.exit },
      transition: spring.moderate,
      present: !props.atEnd,
      reducedMotion: props.context === undefined ? 'user' : presentation.reducedMotion,
    },
  )
}
