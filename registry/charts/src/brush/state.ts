import { DateTime, Option, Predicate, Schema } from 'effect'
import { modifyFields } from 'foldkit/struct'
import {
  BrushRange,
  Configuration,
  InteractionFields,
  initialInteraction,
} from '../cartesian/state'
import type { Interaction } from '../cartesian/state'
import { toDate } from '../cartesian/series'

/** Source layout admits finite parsed cells, including its intentional String conversion. */
export const fullExtent: <Row extends Readonly<Record<string, unknown>>>(
  data: ReadonlyArray<Row>,
  configuration: Pick<OwnerConfiguration, 'xExtentMax'> & { readonly xDataKey: keyof Row & string },
) => Option.Option<Range> = function fullExtent<Row extends Readonly<Record<string, unknown>>>(
  data: ReadonlyArray<Row>,
  configuration: Pick<OwnerConfiguration, 'xExtentMax'> & { readonly xDataKey: keyof Row & string },
) {
  let start = Infinity
  let end = -Infinity

  for (const row of data) {
    const value = row[configuration.xDataKey]

    let time: number

    if (value instanceof Date) {
      time = value.getTime()
    } else if (Predicate.isNumber(value)) {
      time = value
    } else {
      time = Date.parse(String(value))
    }

    if (Number.isFinite(time)) {
      start = Math.min(start, time)
      end = Math.max(end, time)
    }
  }

  if (start === Infinity) {
    return Option.none() satisfies Option.Option<Range>
  }

  if (Option.isSome(configuration.xExtentMax) && configuration.xExtentMax.value.getTime() > end) {
    end = Math.max(end, configuration.xExtentMax.value.getTime())
  }

  return Option.some({ start, end }) satisfies Option.Option<Range>
}

/** Unlike layout extent, the Source strip does not filter invalid cells or extend the upper bound. */
export const stripExtent: <Row extends Readonly<Record<string, unknown>>>(
  data: ReadonlyArray<Row>,
  xDataKey: keyof Row & string,
) => Range = function stripExtent<Row extends Readonly<Record<string, unknown>>>(
  data: ReadonlyArray<Row>,
  xDataKey: keyof Row & string,
) {
  const times = data.map((row) => toDate(row[xDataKey]).getTime())

  return { start: Math.min(...times), end: Math.max(...times) } satisfies Range
}

export const initialControl: (seed: Option.Option<Range>) => Control = function initialControl(
  seed: Option.Option<Range>,
) {
  return { seed, accepted: Option.none(), live: Option.none(), reported: Option.none() }
}

/** Preserve native Date TimeClip, including Source's invalid overflow result. */
export const brushDate: (milliseconds: number) => Date = function brushDate(milliseconds: number) {
  return DateTime.toDateUtc(DateTime.mapEpochMillis(DateTime.makeUnsafe(0), () => milliseconds))
}

export const acceptedRange: (
  control: Control,
  extent: Option.Option<Range>,
) => Option.Option<Range> = function acceptedRange(control: Control, extent: Option.Option<Range>) {
  return Option.orElse(control.accepted, () => Option.orElse(control.seed, () => extent))
}

export const shownRange: (control: Control, extent: Option.Option<Range>) => Option.Option<Range> =
  function shownRange(control: Control, extent: Option.Option<Range>) {
    const live = Option.orElse(control.live, () => acceptedRange(control, extent))

    return Option.isSome(live) && live.value.end - live.value.start <= 0 ? extent : live
  }

export const reportedSelection: (
  control: Control,
  event: BrushObservation,
) => Option.Option<Range> = function reportedSelection(control: Control, event: BrushObservation) {
  if (event.kind === 'cancel') {
    return Option.getOrElse(control.reported, () => control.seed)
  }

  const width =
    event.spanMs > 0 ? ((event.range.end - event.range.start) / event.spanMs) * event.innerWidth : 0

  if (width < 1) {
    return Option.none()
  }

  const pad = (event.spanMs / event.innerWidth) * 2

  return Option.some({
    start: brushDate(event.range.start - pad).getTime(),
    end: brushDate(event.range.end + pad).getTime(),
  })
}

export const observeControl: (control: Control, event: BrushObservation) => Control =
  function observeControl(control: Control, event: BrushObservation) {
    if (event.kind === 'cancel') {
      return modifyFields(control, { live: () => Option.none() })
    }

    return event.kind === 'commit'
      ? modifyFields(control, {
          accepted: () => Option.some(event.range),
          live: () => Option.some(event.range),
          reported: () => Option.some(reportedSelection(control, event)),
        })
      : modifyFields(control, { live: () => Option.some(event.range) })
  }

export const resolveSelection: (
  selection: Option.Option<Range>,
  extent: Option.Option<Range>,
) => Option.Option<Range> = function resolveSelection(
  selection: Option.Option<Range>,
  extent: Option.Option<Range>,
) {
  return Option.orElse(selection, () => extent)
}

export const initialBrushInteraction: (
  configuration: OwnerConfiguration,
  extent: Option.Option<Range>,
) => BrushInteraction = function initialBrushInteraction(
  configuration: OwnerConfiguration,
  extent: Option.Option<Range>,
) {
  return {
    ...initialInteraction(configuration.plot),
    owner: configuration,
    control: initialControl(configuration.seed),
    brushSelection: extent,
  }
}

export type Range = typeof BrushRange.Type

export const Control = Schema.Struct({
  seed: Schema.Option(BrushRange),
  accepted: Schema.Option(BrushRange),
  live: Schema.Option(BrushRange),
  reported: Schema.Option(Schema.Option(BrushRange)),
})

export type Control = typeof Control.Type

export const BrushObservation = Schema.Struct({
  kind: Schema.Literals(['preview', 'commit', 'cancel']),
  range: BrushRange,
  spanMs: Schema.Finite,
  innerWidth: Schema.Finite,
})

export type BrushObservation = typeof BrushObservation.Type

export const OwnerConfiguration = Schema.Struct({
  plot: Configuration,
  xDataKey: Schema.String,
  xExtentMax: Schema.Option(Schema.DateFromString),
  enabled: Schema.Boolean,
  seed: Schema.Option(BrushRange),
})

export type OwnerConfiguration = typeof OwnerConfiguration.Type

export interface BrushInteraction extends Interaction {
  readonly owner: OwnerConfiguration
  readonly control: Control
  readonly brushSelection: Option.Option<Range>
}

export const BrushInteractionFields = {
  ...InteractionFields,
  owner: OwnerConfiguration,
  control: Control,
  brushSelection: Schema.Option(BrushRange),
}
