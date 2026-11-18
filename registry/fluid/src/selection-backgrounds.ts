/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import {
  SELECTION_SNAP_EVENT,
  SelectionSnapGeometry,
  selectionSnapResource,
} from './selection-snap.js'
import type { SelectionSnap } from './selection-snap.js'
import { MIRROR_TARGETS_ATTRIBUTE, observeSelectionMirrors } from './selection-mirrors.js'
import { modifyFields } from 'foldkit/struct'
import { IndexedGeometry, Rect, emptyGeometry, normalizeGeometry } from './lib/indexed-geometry.js'
import { Data, Effect, Layer, Option, Predicate, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import type { Attribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import * as Render from 'foldkit/render'
import type { ItemRect } from './lib/hover-geometry.js'
import { convergeMs, splitMs, mergeSpring, cornerDelay } from './lib/selection-geometry.js'
import { EXIT_COMPLETE_EVENT } from './motion-target.js'
import type { TargetMotionScope } from './motion-target.js'
import {
  SelectionClocks,
  SelectionClocksLayer,
  SelectionClockPlan,
  mountSelectionClock,
} from './selection-clock.js'
import {
  SelectionModel as Model,
  SelectionRun,
  SelectionRowIndex,
  changeSelectionRuns,
  renderSelection,
  selectionRuns,
} from './selection-state.js'
import { SelectionShape } from './selection-state.js'

const Message = defineMessageUnion({
  ResolvedBoundary: { id: Schema.Natural },
  AdvancedFrame: { ids: Schema.Array(Schema.Natural) },
  CompletedExit: { key: Schema.String, generation: Schema.Natural },
  CompletedClock: {},
  CapturedSnap: { ...SelectionSnapGeometry.fields },
  CompletedSnap: { generation: Schema.Natural },
  Unmounted: {},
})

const GeometryInput = Schema.Union([IndexedGeometry, Schema.Array(Schema.NullOr(Rect))])

export const InMessage = defineInMessageUnion({
  RequestedSelection: { indices: Schema.Array(SelectionRowIndex) },
  RequestedSnap: {
    indices: Schema.Array(SelectionRowIndex),
    itemRects: GeometryInput,
    radius: Schema.Finite,
  },
  RequestedRuns: { runs: Schema.Array(SelectionRun) },
  InformedOfGeometry: { itemRects: GeometryInput, radius: Schema.Finite },
})

const Config = Schema.Struct({
  id: Schema.String,
  indices: Schema.optionalKey(Schema.Array(SelectionRowIndex)),
  itemRects: Schema.optionalKey(GeometryInput),
  radius: Schema.optionalKey(Schema.Finite),
})

const effects = Block.makeEffectsContract()

export const SelectionBackgroundsKey = Symbol('SelectionBackgrounds')

export const SelectionBackgroundsBlock = Block.make('SelectionBackgrounds', {
  key: SelectionBackgroundsKey,
  InitArgs: Schema.Tuple([Config]),
  Model,
  Message,
  InMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<SelectionBackgroundsViewInputs>() },
  effects,
})

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const clockPlan: (model: Model) => SelectionClockPlan = (model: Model) => ({
  deadlines: model.boundaries
    .filter((boundary) => boundary.phase !== 'commit')
    .map((boundary) => ({
      id: boundary.tid,
      delay: boundary.kind === 'merge' ? convergeMs : splitMs,
    })),
  nextFrame: model.boundaries
    .filter((boundary) => boundary.phase === 'splitIn' || boundary.phase === 'commit')
    .map((boundary) => boundary.tid),
})

const ObserveClock = SelectionBackgroundsBlock.makeMountStream('ObserveClock', {
  args: { id: Schema.String, plan: SelectionClockPlan, mirrorIds: Schema.Array(Schema.String) },
  messages: [Message.ResolvedBoundary, Message.AdvancedFrame],
  *handler() {
    const clocks = yield* SelectionClocks

    return ({ element, id, plan, mirrorIds, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<
                typeof Message.ResolvedBoundary.Type | typeof Message.AdvancedFrame.Type
              >((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    if (clocks.has(id)) {
                      throw new Error(`Duplicate Fluid selection id: ${id}`)
                    }

                    const clock = mountSelectionClock(
                      element,
                      (boundaryId) => {
                        Queue.offerUnsafe(queue, Message.ResolvedBoundary({ id: boundaryId }))
                      },
                      (ids) => {
                        Queue.offerUnsafe(queue, Message.AdvancedFrame({ ids }))
                      },
                    )

                    clocks.set(id, clock)
                    clock.synchronize(plan)

                    const releaseMirrors = observeSelectionMirrors(element, mirrorIds)
                    return { clock, releaseMirrors }
                  }),
                  ({ clock, releaseMirrors }) =>
                    Effect.sync(() => {
                      releaseMirrors()
                      clock.dispose()
                      clocks.delete(id)
                    }),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})

const SynchronizeClock = SelectionBackgroundsBlock.makeCommand('SynchronizeClock', {
  args: { id: Schema.String, plan: SelectionClockPlan },
  messages: [Message.CompletedClock],
  *handler() {
    const clocks = yield* SelectionClocks

    return ({ id, plan }) =>
      Effect.gen(function* () {
        yield* Render.afterCommit
        clocks.get(id)?.synchronize(plan)

        return Message.CompletedClock()
      })
  },
})

const CompleteSnap = SelectionBackgroundsBlock.makeCommand('CompleteSnap', {
  args: { generation: Schema.Natural },
  messages: [Message.CompletedSnap],
  *handler() {
    return ({ generation }) =>
      Effect.gen(function* () {
        yield* Render.afterCommit
        yield* Effect.callback<void>((resume) => {
          const frame = requestAnimationFrame(() => resume(Effect.void))
          return Effect.sync(() => cancelAnimationFrame(frame))
        })
        return Message.CompletedSnap({ generation })
      })
  },
})

const SelectionBackgroundsComposition = SelectionBackgroundsBlock.makeComposition({
  mounts: [ObserveClock],
})

export interface SelectionConfig {
  readonly id: string
  readonly indices?: ReadonlyArray<number>
  readonly itemRects?: IndexedGeometry | ReadonlyArray<ItemRect | null>
  readonly radius?: number
}

const init = SelectionBackgroundsComposition.makeInit((config: SelectionConfig) => {
  const empty = Model.make({
    id: config.id,
    snapGeneration: 0,
    snapPending: false,
    snapMeasured: false,
    runs: [],
    lastId: 0,
    lastTid: 0,
    boundaries: [],
    itemRects: config.itemRects === undefined ? emptyGeometry : normalizeGeometry(config.itemRects),
    radius: config.radius ?? 0,
    slots: [],
  })

  const ids = selectionRuns(empty, config.indices ?? [])

  return { model: renderSelection({ ...empty, runs: ids.runs, lastId: ids.lastId }) }
})

const rendered = (next: Model) => ({
  model: renderSelection(next),
  commands: [SynchronizeClock({ id: next.id, plan: clockPlan(next) })],
})

const inMessageUpdate = SelectionBackgroundsComposition.makeInMessageUpdate({
  RequestedSnap: (model, { indices, itemRects, radius }) => {
    const ids = selectionRuns(model, indices)
    const next = renderSelection({
      ...model,
      runs: ids.runs,
      lastId: ids.lastId,
      boundaries: [],
      slots: [],
      snapGeneration: model.snapGeneration + 1,
      snapPending: ids.runs.length > 0,
      snapMeasured: false,
      itemRects: normalizeGeometry(itemRects),
      radius,
    })
    const slots = ids.runs.map((run) => {
      const existing = next.slots.find((slot) => slot.shape.key === `sel-${run.id}`)
      return existing === undefined
        ? {
            generation: next.snapGeneration,
            present: true,
            shape: {
              key: `sel-${run.id}`,
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              radii: [radius, radius, radius, radius] satisfies SelectionShape['radii'],
              instant: true,
              exitInstant: true,
              delayCorners: false,
            },
          }
        : { ...existing, shape: { ...existing.shape, instant: true, exitInstant: true } }
    })
    return {
      model: { ...next, slots },
      commands: [SynchronizeClock({ id: model.id, plan: { deadlines: [], nextFrame: [] } })],
    }
  },
  RequestedSelection: (model, { indices }) => {
    const ids = selectionRuns(model, indices)

    const next = changeSelectionRuns(modifyFields(model, { lastId: () => ids.lastId }), ids.runs)
    return next === model ? { model } : rendered(next)
  },
  RequestedRuns: (model, { runs }) => {
    let { lastId } = model

    for (const run of runs) {
      lastId = Math.max(lastId, run.id)
    }

    const next = changeSelectionRuns(modifyFields(model, { lastId: () => lastId }), runs)
    return next === model ? { model } : rendered(next)
  },
  InformedOfGeometry: (model, { itemRects, radius }) => ({
    model: renderSelection(
      modifyFields(model, { itemRects: () => normalizeGeometry(itemRects), radius: () => radius }),
    ),
  }),
})

const update = SelectionBackgroundsComposition.makeUpdate({
  CapturedSnap: (model, { generation, itemRects }) => {
    if (!model.snapPending || model.snapMeasured || generation !== model.snapGeneration)
      return { model }
    return {
      model: { ...renderSelection({ ...model, itemRects }), snapMeasured: true },
      commands: [CompleteSnap({ generation })],
    }
  },
  CompletedSnap: (model, { generation }) => ({
    model: generation === model.snapGeneration ? { ...model, snapPending: false } : model,
  }),
  ResolvedBoundary: (model, { id }) =>
    rendered(
      modifyFields(model, {
        boundaries: (currentBoundaries) =>
          currentBoundaries.flatMap((boundary) => {
            if (boundary.tid !== id) {
              return [boundary]
            }

            return boundary.kind === 'merge' ? [{ ...boundary, phase: 'commit' }] : []
          }),
      }),
    ),
  AdvancedFrame: (model, { ids }) =>
    rendered(
      modifyFields(model, {
        boundaries: (currentBoundaries) =>
          currentBoundaries.flatMap((boundary) => {
            if (!ids.includes(boundary.tid)) {
              return [boundary]
            }

            if (boundary.phase === 'commit') {
              return []
            }

            return [
              { ...boundary, phase: boundary.phase === 'splitIn' ? 'diverge' : boundary.phase },
            ]
          }),
      }),
    ),
  CompletedExit: (model, { key, generation }) => ({
    model: modifyFields(model, {
      slots: (currentSlots) =>
        currentSlots.filter(
          (slot) => slot.shape.key !== key || slot.generation !== generation || slot.present,
        ),
    }),
  }),
  CompletedClock: (model) => ({ model }),
  Unmounted: (model) => ({
    model: renderSelection(modifyFields(model, { boundaries: () => [], slots: () => [] })),
  }),
})

export interface SelectionBackgroundsViewInputs {
  readonly radius?: number
  readonly mirrorIds?: ReadonlyArray<string>
  readonly snapGeometryOriginId?: string
  readonly animate: (
    node: Html,
    shape: SelectionShape & {
      readonly snap?: SelectionSnap
      readonly fluidPresentation?: { readonly mirrored: boolean }
    },
    present: boolean,
  ) => Html
}

const presentationShape: (
  shape: typeof SelectionShape.Type,
  radius: number | undefined,
) => typeof SelectionShape.Type = (
  shape: typeof SelectionShape.Type,
  radius: number | undefined,
) => {
  if (radius === undefined) return shape
  const corners: (radii: SelectionShape['radii']) => SelectionShape['radii'] = (
    radii: SelectionShape['radii'],
  ) => [
    radii[0] === 0 ? 0 : radius,
    radii[1] === 0 ? 0 : radius,
    radii[2] === 0 ? 0 : radius,
    radii[3] === 0 ? 0 : radius,
  ]
  return {
    ...shape,
    radii: corners(shape.radii),
    ...(shape.enterFrom === undefined
      ? {}
      : {
          enterFrom: { ...shape.enterFrom, radii: corners(shape.enterFrom.radii) },
        }),
  }
}

const view = SelectionBackgroundsComposition.makeView.withInputs<SelectionBackgroundsViewInputs>(
  (model, inputs, h) =>
    h.keyed('div')(
      model.id,
      [
        h.Id(model.id),
        h.Class('contents'),
        h.DataAttribute(MIRROR_TARGETS_ATTRIBUTE, JSON.stringify(inputs.mirrorIds ?? [])),
        h.OnMount(
          ObserveClock({ id: model.id, plan: clockPlan(model), mirrorIds: inputs.mirrorIds ?? [] }),
        ),
        ...(Predicate.isUndefined(globalThis.window) ? [] : [h.OnUnmount(Message.Unmounted())]),
      ],
      model.slots.map((slot) => {
        const complete = Events.OnCustomEvent({
          name: EXIT_COMPLETE_EVENT,
          f: () =>
            Option.some(
              Message.CompletedExit({ key: slot.shape.key, generation: slot.generation }),
            ),
        })

        return inputs.animate(
          h.keyed('div')(slot.shape.key, [
            h.AriaHidden(true),
            h.Class('absolute bg-active pointer-events-none'),
            complete,
            Events.OnCustomEvent({
              name: SELECTION_SNAP_EVENT,
              f: (event) =>
                Schema.is(SelectionSnapGeometry)(event.detail)
                  ? Option.some(Message.CapturedSnap(event.detail))
                  : Option.none(),
            }),
          ]),
          {
            ...presentationShape(slot.shape, inputs.radius),
            ...((inputs.mirrorIds?.length ?? 0) > 0
              ? { fluidPresentation: { mirrored: true } }
              : {}),
            ...(model.snapPending && slot.present && inputs.snapGeometryOriginId !== undefined
              ? {
                  instant: true,
                  exitInstant: true,
                  snap: {
                    originId: inputs.snapGeometryOriginId,
                    generation: model.snapGeneration,
                    start:
                      model.runs.find((run) => `sel-${run.id}` === slot.shape.key)?.start ?? -1,
                    end: model.runs.find((run) => `sel-${run.id}` === slot.shape.key)?.end ?? -1,
                  },
                }
              : {}),
          },
          slot.present,
        )
      }),
    ),
)

const EffectsLayer = Layer.mergeAll(
  ObserveClock.layer,
  SynchronizeClock.layer,
  CompleteSnap.layer,
).pipe(Layer.provide(SelectionClocksLayer))

export const layer = SelectionBackgroundsBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer,
})

const corners = (radii: SelectionShape['radii']) => ({
  borderTopLeftRadius: radii[0],
  borderTopRightRadius: radii[1],
  borderBottomRightRadius: radii[2],
  borderBottomLeftRadius: radii[3],
})

export const selectionBackgroundAnimation: (
  motion: TargetMotionScope,
) => SelectionBackgroundsViewInputs['animate'] =
  (motion: TargetMotionScope) => (node, shape, present) => {
    const corner = shape.delayCorners
      ? { ...mergeSpring, delay: shape.cornerDelay ?? cornerDelay }
      : mergeSpring

    const opacity = shape.opacity ?? 1

    return motion.node(node, {
      ...(shape.fluidPresentation?.mirrored ? { onUpdate: () => {} } : {}),
      present,
      ...(shape.snap === undefined ? {} : { resource: selectionSnapResource(shape.snap) }),
      initial: shape.enterFrom
        ? {
            opacity,
            top: shape.enterFrom.top,
            left: shape.left,
            width: shape.width,
            height: shape.enterFrom.height,
            ...corners(shape.enterFrom.radii),
          }
        : false,
      animate: {
        top: shape.top,
        left: shape.left,
        width: shape.width,
        height: shape.height,
        ...corners(shape.radii),
        opacity,
      },
      exit: { opacity: 0, transition: shape.exitInstant ? { duration: 0 } : mergeSpring.exit },
      transition: shape.instant
        ? { duration: 0 }
        : {
            ...mergeSpring,
            borderTopLeftRadius: corner,
            borderTopRightRadius: corner,
            borderBottomRightRadius: corner,
            borderBottomLeftRadius: corner,
            opacity: { duration: 0.08 },
          },
    })
  }

export type { SelectionShape } from './selection-state.js'
export type { Run, SelBlock } from './lib/selection-geometry.js'

export const test = { SynchronizeClock, CompleteSnap }
