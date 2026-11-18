import { highlightFrameUpdate } from './highlight-frame.js'
import { highlightSnapResource } from './highlight-snap.js'
import type { HighlightSnap } from './highlight-snap.js'
import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { modifyFields } from 'foldkit/struct'
import { rectAt } from './lib/indexed-geometry.js'
import { Data, Effect, Layer, Option, Queue, Schema, Stream, Number } from 'effect'
import { Block } from 'foldkit'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { Transition } from 'motion-dom'
import { HoverMode, Snapshot } from './hover-observation.js'
import type { ItemRect } from './lib/hover-geometry.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import { EXIT_COMPLETE_EVENT, createTargetMotionScope } from './motion-target.js'
import type { TargetMotionScope } from './motion-target.js'

const Rect = Schema.Struct({
  top: Schema.Finite,
  left: Schema.Finite,
  width: Schema.Finite,
  height: Schema.Finite,
})

const Slot = Schema.Struct({
  session: Schema.Finite,
  rect: Rect,
  maybeTargetKey: Schema.OptionFromNullOr(Schema.String).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(null)),
  ),
  hasRowChanged: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  phase: Schema.Literals(['Present', 'Exiting']),
  generation: Schema.Finite,
})

const Model = Schema.Struct({
  id: Schema.String,
  slots: Schema.Array(Slot),
  mode: HoverMode.pipe(Schema.withDecodingDefaultKey(Effect.succeed('fluid'))),
  isReducedMotion: Schema.Boolean,
})

type Model = typeof Model.Type

const Message = defineMessageUnion({
  CompletedExit: { session: Schema.Finite, generation: Schema.Finite },
  ObservedReducedMotion: { value: Schema.Boolean },
  Unmounted: {},
})

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const effects = Block.makeEffectsContract()

export const InMessage = defineInMessageUnion({
  RequestedRect: {
    rect: Schema.NullOr(Rect),
    session: Schema.Finite,
    mode: Schema.optionalKey(HoverMode),
  },
  RequestedHide: {},
  InformedOfSource: {
    mode: Schema.optionalKey(HoverMode),
    snapshot: Snapshot,
    hidden: Schema.Boolean,
    targetKey: Schema.optionalKey(Schema.String),
    allowUnmeasured: Schema.optionalKey(Schema.Boolean),
  },
})

export const HoverHighlightKey = Symbol('HoverHighlight')

export const HoverHighlightBlock = Block.make('HoverHighlight', {
  key: HoverHighlightKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({ id: Schema.String, mode: Schema.optionalKey(HoverMode) }),
  ]),
  Model,
  Message,
  InMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<HoverHighlightViewInputs>() },
  effects,
})

const ObserveReducedMotion = HoverHighlightBlock.makeMountStream('ObserveReducedMotion', {
  messages: [Message.ObservedReducedMotion],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.ObservedReducedMotion.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const window = element.ownerDocument.defaultView

                    if (window === null) {
                      throw new Error('Fluid highlight requires a live document')
                    }

                    const query = window.matchMedia('(prefers-reduced-motion: reduce)')

                    const emit = () => {
                      Queue.offerUnsafe(
                        queue,
                        Message.ObservedReducedMotion({ value: query.matches }),
                      )
                    }

                    query.addEventListener('change', emit)
                    emit()

                    return () => {
                      query.removeEventListener('change', emit)
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

const HoverHighlightComposition = HoverHighlightBlock.makeComposition({
  mounts: [ObserveReducedMotion],
})

const init = HoverHighlightComposition.makeInit(
  (config: { readonly id: string; readonly mode?: HoverMode }) => ({
    model: Model.make({
      id: config.id,
      slots: [],
      isReducedMotion: false,
      mode: config.mode ?? 'fluid',
    }),
  }),
)

const exiting: (slot: typeof Slot.Type) => typeof Slot.Type = (slot: typeof Slot.Type) =>
  slot.phase === 'Exiting'
    ? slot
    : modifyFields(slot, { phase: () => 'Exiting', generation: Number.increment })

const requestedRect = (
  model: Model,
  rect: ItemRect | null,
  session: number,
  targetKey?: string,
  mode: HoverMode = model.mode,
) => {
  if (mode === 'standard') {
    return {
      model: modifyFields(model, {
        mode: () => mode,
        slots: () =>
          rect === null
            ? []
            : [
                Slot.make({
                  session,
                  rect,
                  maybeTargetKey: Option.fromUndefinedOr(targetKey),
                  hasRowChanged: true,
                  phase: 'Present',
                  generation: 0,
                }),
              ],
      }),
    }
  }
  const slots = model.slots.map((slot) => {
    if (rect === null || slot.session !== session) {
      return exiting(slot)
    }

    const sameRow =
      slot.phase === 'Present' &&
      targetKey !== undefined &&
      Option.isSome(slot.maybeTargetKey) &&
      slot.maybeTargetKey.value === targetKey

    const sameRect =
      slot.rect.left === rect.left &&
      slot.rect.top === rect.top &&
      slot.rect.width === rect.width &&
      slot.rect.height === rect.height

    return modifyFields(slot, {
      rect: () => rect,
      maybeTargetKey: () => Option.fromUndefinedOr(targetKey),
      hasRowChanged: (currentRowChanged) => (sameRow ? sameRect && currentRowChanged : true),
      phase: () => 'Present',
      generation: () => (slot.phase === 'Exiting' ? slot.generation + 1 : slot.generation),
    }) satisfies typeof Slot.Type
  })

  if (rect !== null && !slots.some((slot) => slot.session === session)) {
    slots.push({
      session,
      rect,
      maybeTargetKey: Option.fromUndefinedOr(targetKey),
      hasRowChanged: true,
      phase: 'Present',
      generation: 0,
    })
  }

  return { model: modifyFields(model, { mode: () => mode, slots: () => slots }) }
}

const inMessageUpdate = HoverHighlightComposition.makeInMessageUpdate({
  RequestedRect: (model, { rect, session, mode }) =>
    requestedRect(model, rect, session, undefined, mode),
  RequestedHide: (model) => ({
    model: modifyFields(model, {
      slots: () => (model.mode === 'standard' ? [] : model.slots.map(exiting)),
    }),
  }),
  InformedOfSource: (model, { snapshot, hidden, targetKey, mode, allowUnmeasured }) =>
    requestedRect(
      model,
      !hidden && (snapshot.isMeasured || allowUnmeasured) && snapshot.activeIndex !== null
        ? (rectAt(snapshot.itemRects, snapshot.activeIndex) ??
            (allowUnmeasured ? { top: 0, left: 0, width: 0, height: 0 } : null))
        : null,
      snapshot.session,
      targetKey,
      mode,
    ),
})

const update = HoverHighlightComposition.makeUpdate({
  CompletedExit: (model, { session, generation }) => ({
    model: modifyFields(model, {
      slots: (currentSlots) =>
        currentSlots.filter(
          (slot) =>
            slot.session !== session || slot.generation !== generation || slot.phase !== 'Exiting',
        ),
    }),
  }),
  ObservedReducedMotion: (model, { value }) => ({
    model: modifyFields(model, { isReducedMotion: () => value }),
  }),
  Unmounted: (model) => ({ model: modifyFields(model, { slots: () => [] }) }),
})

export interface HoverHighlightTarget extends ItemRect {
  readonly fluidPresentation?: {
    readonly snap?: HighlightSnap
    readonly observeFrame?: boolean
  }
}

export interface HoverHighlightViewInputs {
  readonly observeFrame?: boolean
  readonly snap?: HighlightSnap
  readonly instant?: boolean
  readonly children?: ReadonlyArray<Html | string>
  readonly mode?: HoverMode
  readonly animate: (
    node: Html,
    present: boolean,
    rect: HoverHighlightTarget,
    reduceMotion: boolean,
    transition?: false,
  ) => Html
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const makeView = (staticMotion: TargetMotionScope) =>
  HoverHighlightComposition.makeView.withInputs<HoverHighlightViewInputs>((model, inputs, h) =>
    h.div(
      [
        h.Id(model.id),
        h.Class('contents'),
        h.OnMount(ObserveReducedMotion()),
        ...(typeof window === 'undefined' ? [] : [h.OnUnmount(Message.Unmounted())]),
      ],
      model.slots
        .filter((slot) => (inputs.mode ?? model.mode) !== 'standard' || slot.phase === 'Present')
        .map((slot) => {
          const target: HoverHighlightTarget = {
            ...slot.rect,
            fluidPresentation: {
              ...(slot.phase === 'Present' && inputs.snap !== undefined
                ? { snap: inputs.snap }
                : {}),
              ...(inputs.observeFrame ? { observeFrame: true } : {}),
            },
          }
          if ((inputs.mode ?? model.mode) === 'standard') {
            return staticMotion.node(
              h.keyed('div')(
                String(slot.session),
                sourceStyleAttributes(
                  {
                    transform: `translate(${slot.rect.left}px, ${slot.rect.top}px)`,
                    width: `${slot.rect.width}px`,
                    height: `${slot.rect.height}px`,
                  },
                  [
                    h.Class(
                      cn('pointer-events-none absolute left-0 top-0 bg-hover', inputs.className),
                    ),
                    h.DataAttribute('slot', 'fluid-hover-highlight'),
                    ...(inputs.attributes ?? []),
                  ],
                ),
                inputs.children,
              ),
              {
                initial: { opacity: 1, ...toHighlightTarget(slot.rect) },
                animate: { opacity: 1, ...toHighlightTarget(slot.rect) },
                transition: { duration: 0 },
                ...(inputs.snap === undefined
                  ? {}
                  : { resource: highlightSnapResource(inputs.snap) }),
                ...(inputs.observeFrame ? { onUpdate: highlightFrameUpdate(slot.rect) } : {}),
              },
            )
          }
          const completion = Events.OnCustomEvent({
            name: EXIT_COMPLETE_EVENT,
            f: () =>
              Option.some(
                Message.CompletedExit({ session: slot.session, generation: slot.generation }),
              ),
          })

          return inputs.animate(
            h.keyed('div')(
              String(slot.session),
              [
                h.DataAttribute('slot', 'fluid-hover-highlight'),
                h.DataAttribute('session', String(slot.session)),
                h.Class(cn('pointer-events-none absolute left-0 top-0 bg-hover', inputs.className)),
                completion,
                ...(inputs.attributes ?? []),
              ],
              inputs.children,
            ),
            slot.phase === 'Present',
            target,
            model.isReducedMotion,
            inputs.instant || !slot.hasRowChanged ? false : undefined,
          )
        }),
    ),
  )

export const layer = HoverHighlightBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* HoverHighlightComposition.acquireChildren()
    const staticMotion = createTargetMotionScope('fluid-static-highlight')
    yield* Layer.build(staticMotion.layer)
    return {
      children,
      init,
      update,
      inMessageUpdate,
      view: makeView(staticMotion),
      EffectsLayer: ObserveReducedMotion.layer,
    }
  }),
)

export const toHighlightTarget = (rect: ItemRect) => ({
  x: rect.left,
  y: rect.top,
  width: rect.width,
  height: rect.height,
})

export const resolveHighlightTransition: (
  transition: Transition | false | undefined,
  reduceMotion: boolean,
) => Transition = (transition: Transition | false | undefined, reduceMotion: boolean) => ({
  ...(transition === false || reduceMotion ? { duration: 0 } : (transition ?? spring.fast)),
  opacity: { duration: 0.08 },
})

export interface HoverHighlightAnimationOptions {
  readonly from?: ItemRect | null
  readonly fadeIn?: boolean
  readonly transition?: Transition | false
}

export const hoverHighlightAnimation: (
  motion: TargetMotionScope,
  options?: HoverHighlightAnimationOptions,
) => HoverHighlightViewInputs['animate'] = (
  motion: TargetMotionScope,
  options: HoverHighlightAnimationOptions = {},
) =>
  ((node, present, rect, reduceMotion, transition) =>
    motion.node(node, {
      ...(rect.fluidPresentation?.snap === undefined
        ? {}
        : { resource: highlightSnapResource(rect.fluidPresentation.snap) }),
      ...(rect.fluidPresentation?.observeFrame ? { onUpdate: highlightFrameUpdate(rect) } : {}),
      initial: {
        opacity: options.fadeIn === false ? 1 : 0,
        ...toHighlightTarget(options.from ?? rect),
      },
      animate: { opacity: 1, ...toHighlightTarget(rect) },
      exit: { opacity: 0, transition: spring.fast.exit },
      transition: resolveHighlightTransition(transition ?? options.transition, reduceMotion),
      present,
    })) satisfies HoverHighlightViewInputs['animate']
