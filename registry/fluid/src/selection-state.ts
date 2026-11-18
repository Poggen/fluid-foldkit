import { modifyFields } from 'foldkit/struct'
import { IndexedGeometry } from './lib/indexed-geometry.js'
import { Effect, Schema } from 'effect'
import { Rect } from './hover-observation.js'
import {
  assignRunIds,
  bridgePair,
  buildSelectionBlocks,
  type Run,
} from './lib/selection-geometry.js'

export const SelectionRowIndex = Schema.Union([Schema.Finite, Schema.NumberFromString])

export const SelectionRun = Schema.Struct({
  start: SelectionRowIndex,
  end: SelectionRowIndex,
  id: Schema.Natural,
})

export const SelectionBoundary = Schema.Struct({
  tid: Schema.Natural,
  kind: Schema.Literals(['merge', 'split']),
  survivorId: Schema.Natural,
  otherId: Schema.Natural,
  gapIndex: SelectionRowIndex,
  phase: Schema.Literals(['converge', 'commit', 'splitIn', 'diverge']),
})

const Radii = Schema.Tuple([Schema.Finite, Schema.Finite, Schema.Finite, Schema.Finite])

export const SelectionShape = Schema.Struct({
  ...Rect.fields,
  key: Schema.String,
  radii: Radii,
  instant: Schema.Boolean,
  exitInstant: Schema.Boolean,
  delayCorners: Schema.Boolean,
  cornerDelay: Schema.optionalKey(Schema.Finite),
  opacity: Schema.optionalKey(Schema.Finite),
  enterFrom: Schema.optionalKey(
    Schema.Struct({ top: Schema.Finite, height: Schema.Finite, radii: Radii }),
  ),
})

export interface SelectionShape extends Schema.Schema.Type<typeof SelectionShape> {}

export const SelectionSlot = Schema.Struct({
  shape: SelectionShape,
  present: Schema.Boolean,
  generation: Schema.Natural,
})

export const SelectionModel = Schema.Struct({
  id: Schema.String,
  snapGeneration: Schema.Natural.pipe(Schema.withDecodingDefaultKey(Effect.succeed(0))),
  snapPending: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  snapMeasured: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  runs: Schema.Array(SelectionRun),
  lastId: Schema.Natural,
  lastTid: Schema.Natural,
  boundaries: Schema.Array(SelectionBoundary),
  itemRects: IndexedGeometry,
  radius: Schema.Finite,
  slots: Schema.Array(SelectionSlot),
})

export type SelectionModel = Schema.Schema.Type<typeof SelectionModel>

export const selectionRuns = (model: SelectionModel, indices: ReadonlyArray<number>) => {
  const byRow = new Map<number, number>()

  for (const run of model.runs)
    for (let index = run.start; index <= run.end; index += 1) byRow.set(index, run.id)

  return assignRunIds(
    [...indices].sort((a, b) => a - b),
    byRow,
    model.lastId,
  )
}

/** Runs and first-frame seam geometry advance atomically in the pure update. */
export const changeSelectionRuns: (
  model: SelectionModel,
  runs: ReadonlyArray<Run>,
) => SelectionModel = (model: SelectionModel, runs: ReadonlyArray<Run>) => {
  if (
    runs.length === model.runs.length &&
    runs.every((run, index) => {
      const previous = model.runs[index]

      return previous?.id === run.id && previous.start === run.start && previous.end === run.end
    })
  )
    return model
  const found: Array<typeof SelectionBoundary.Type> = []
  let lastTid = model.lastTid

  for (const current of runs) {
    const pair = bridgePair(current, model.runs)

    if (pair && (current.id === pair.up.id || current.id === pair.lo.id))
      found.push({
        tid: ++lastTid,
        kind: 'merge',
        survivorId: current.id,
        otherId: current.id === pair.up.id ? pair.lo.id : pair.up.id,
        gapIndex: pair.gap,
        phase: 'converge',
      })
  }

  for (const previous of model.runs) {
    const pair = bridgePair(previous, runs)

    if (pair)
      found.push({
        tid: ++lastTid,
        kind: 'split',
        survivorId: pair.up.id,
        otherId: pair.lo.id,
        gapIndex: pair.gap,
        phase: 'splitIn',
      })
  }

  const valid = model.boundaries.filter((boundary) =>
    boundary.kind === 'merge'
      ? runs.some(
          (run) =>
            run.id === boundary.survivorId &&
            boundary.gapIndex > run.start &&
            boundary.gapIndex < run.end,
        )
      : runs.some((run) => run.id === boundary.survivorId && run.end === boundary.gapIndex - 1) &&
        runs.some((run) => run.id === boundary.otherId && run.start === boundary.gapIndex + 1),
  )

  return modifyFields(model, {
    runs: () => runs,
    lastTid: () => lastTid,
    boundaries: () => [...valid, ...found],
  })
}

export const renderSelection: (model: SelectionModel) => SelectionModel = (
  model: SelectionModel,
) => {
  const shapes = buildSelectionBlocks(
    model.runs,
    model.itemRects,
    model.radius,
    model.boundaries,
    model.runs,
  )

  const slots = model.slots.map((slot) => {
    const shape = shapes.find((candidate) => candidate.key === slot.shape.key)

    return shape === undefined
      ? modifyFields(slot, {
          present: () => false,
          generation: () => slot.generation + (slot.present ? 1 : 0),
        })
      : { shape, present: true, generation: slot.generation + (slot.present ? 0 : 1) }
  })

  for (const shape of shapes)
    if (!slots.some((slot) => slot.shape.key === shape.key))
      slots.push({ shape, present: true, generation: 0 })

  return modifyFields(model, { slots: () => slots })
}
