// Derived from Fluid Functionalism 200b4534, MIT; see NOTICE
import { Match, Schema } from 'effect'
import { Month, Selection } from '../calendar-state.js'
import type { CalendarState, Projection } from '../calendar-state.js'

export const Rect = Schema.Struct({
  left: Schema.Finite,
  top: Schema.Finite,
  width: Schema.Finite,
  height: Schema.Finite,
})

export const Band = Schema.Struct({ from: Schema.Int, to: Schema.Int })

export const RetainedPanel = Schema.Struct({
  key: Schema.String,
  generation: Schema.Int,
  index: Schema.Int,
  month: Month,
})

export const OverlaySlot = Schema.Struct({
  key: Schema.String,
  group: Schema.String,
  rect: Rect,
  present: Schema.Boolean,
  generation: Schema.Int,
})

export const VisualState = Schema.Struct({
  occurrence: Schema.Int,
  generation: Schema.Int,
  ghostGeneration: Schema.Int,
  committedEndGeneration: Schema.Int,
  direction: Schema.Int,
  fits: Schema.Boolean,
  stride: Schema.NullOr(Schema.Finite),
  reduceMotion: Schema.Boolean,
  heights: Schema.Record(Schema.String, Schema.Finite),
  measurementGeneration: Schema.Int,
  heightSpring: Schema.Boolean,
  active: Schema.NullOr(Schema.Int),
  focused: Schema.NullOr(Schema.Int),
  pressed: Schema.Boolean,
  snap: Schema.Boolean,
  rects: Schema.Record(Schema.String, Rect),
  navRects: Schema.Record(Schema.String, Rect),
  navActive: Schema.NullOr(Schema.String),
  retained: Schema.Array(RetainedPanel),
  overlays: Schema.Array(OverlaySlot),
  overlaySequence: Schema.Int,
  lastCommitted: Schema.NullOr(Band),
  ghost: Schema.NullOr(Schema.Struct({ ...Band.fields, generation: Schema.Int })),
  committedEnd: Schema.NullOr(Schema.Int),
})

export type VisualState = typeof VisualState.Type

export const Observation = Schema.TaggedUnion({
  Measured: {
    generation: Schema.Int,
    heights: Schema.Record(Schema.String, Schema.Finite),
    navRects: Schema.Record(Schema.String, Rect),
    fits: Schema.Boolean,
    stride: Schema.NullOr(Schema.Finite),
    rects: Schema.Record(Schema.String, Rect),
    reduceMotion: Schema.Boolean,
  },
  NavActive: { key: Schema.NullOr(Schema.String) },
  Active: { ordinal: Schema.NullOr(Schema.Int), keyboard: Schema.Boolean },
  Pressed: { value: Schema.Boolean },
  OverlayExited: { key: Schema.String, generation: Schema.Int },
  PanelExited: { key: Schema.String },
  GhostSettled: { generation: Schema.Int },
  CommittedEndSettled: { generation: Schema.Int },
  SnapReleased: {},
})

export type Observation = typeof Observation.Type

export type { PresentationProjection } from './presentation.js'

export function committedBand(selection: Selection): typeof Band.Type | null {
  return Selection.isAnyOf(['Range'])(selection) && selection.from !== null && selection.to !== null
    ? { from: selection.from.ordinal, to: selection.to.ordinal }
    : null
}

export function initialVisual(selection: Selection): VisualState {
  return {
    occurrence: 0,
    generation: 0,
    ghostGeneration: 0,
    committedEndGeneration: 0,
    direction: 0,
    fits: true,
    stride: null,
    reduceMotion: false,
    heights: {},
    measurementGeneration: 0,
    heightSpring: false,
    active: null,
    focused: null,
    pressed: false,
    snap: false,
    rects: {},
    navRects: {},
    navActive: null,
    retained: [],
    overlays: [],
    overlaySequence: 0,
    lastCommitted: committedBand(selection),
    ghost: null,
    committedEnd: null,
  }
}

export function observeVisual(state: VisualState, observation: Observation): VisualState {
  return Match.value(observation).pipe(
    Match.tagsExhaustive({
      Measured: (observed): VisualState => ({
        ...state,
        heightSpring: observed.generation !== state.measurementGeneration,
        measurementGeneration: observed.generation,
        heights: observed.heights,
        navRects: observed.navRects,
        fits: observed.fits,
        stride: observed.stride,
        rects: observed.rects,
        reduceMotion: observed.reduceMotion,
      }),
      NavActive: (observed): VisualState => ({ ...state, navActive: observed.key }),
      Active: (observed): VisualState => ({
        ...state,
        active: observed.ordinal,
        focused: observed.keyboard ? observed.ordinal : null,
        snap: observed.keyboard ? state.snap : false,
      }),
      Pressed: (observed): VisualState => ({
        ...state,
        pressed: observed.value,
        focused: observed.value ? null : state.focused,
      }),
      OverlayExited: (observed): VisualState => ({
        ...state,
        overlays: state.overlays.filter(
          (slot) =>
            slot.key !== observed.key || slot.generation !== observed.generation || slot.present,
        ),
      }),
      PanelExited: (observed): VisualState => ({
        ...state,
        retained: state.retained.filter((panel) => panel.key !== observed.key),
      }),
      SnapReleased: (): VisualState => ({ ...state, snap: false }),
      GhostSettled: (observed): VisualState =>
        state.ghost !== null && observed.generation === state.ghostGeneration
          ? { ...state, ghost: null }
          : state,
      CommittedEndSettled: (observed): VisualState =>
        state.committedEnd !== null && observed.generation === state.committedEndGeneration
          ? { ...state, committedEnd: null }
          : state,
    }),
  )
}
// Fold synchronously alongside CompletedTransition, before the incoming view.
// Keeping the outgoing data in the owner preserves custom slot content and avoids DOM cloning.

export function panelKey(
  visual: VisualState,
  month: Projection['months'][number],
  index: number,
): string {
  return `${visual.occurrence}-${visual.generation}-${index}-${month.date}`
}

export function transitionVisual(
  visual: VisualState,
  previous: CalendarState,
  next: CalendarState,
  previousPreviewEnd: number | null,
): VisualState {
  const monthChanged = previous.projection.firstMonth !== next.projection.firstMonth
  const committed = committedBand(next.selection.selected)
  const replaced = visual.lastCommitted !== null && committed === null
  const generation = monthChanged ? visual.generation + 1 : visual.generation

  const fromPicking =
    Selection.isAnyOf(['Range'])(previous.selection.selected) &&
    previous.selection.selected.to === null

  const committedEnd =
    fromPicking &&
    committed !== null &&
    previousPreviewEnd !== null &&
    (committed.from === previousPreviewEnd || committed.to === previousPreviewEnd)
      ? previousPreviewEnd
      : visual.committedEnd

  const ghostGeneration = replaced ? visual.ghostGeneration + 1 : visual.ghostGeneration

  const committedEndGeneration =
    committedEnd === visual.committedEnd
      ? visual.committedEndGeneration
      : visual.committedEndGeneration + 1

  const direction = next.projection.firstMonth > previous.projection.firstMonth ? 1 : -1

  return {
    ...visual,
    generation,
    ghostGeneration,
    committedEndGeneration,
    committedEnd,
    lastCommitted: committed,
    ghost:
      replaced && visual.lastCommitted !== null
        ? { ...visual.lastCommitted, generation: ghostGeneration }
        : visual.ghost,
    direction: monthChanged ? direction : visual.direction,
    snap: monthChanged || visual.snap,
    active: monthChanged ? null : visual.active,
    focused: monthChanged ? null : visual.focused,
    rects: monthChanged ? {} : visual.rects,
    retained: monthChanged
      ? [
          ...visual.retained,
          ...previous.projection.months.map((month, index) => ({
            key: panelKey(visual, month, index),
            generation: visual.generation,
            index,
            month,
          })),
        ]
      : visual.retained,
  }
}

function overlayRect(state: VisualState, group: string): typeof Rect.Type | null {
  if (group === 'hover') {
    return state.active === null ? null : (state.rects[String(state.active)] ?? null)
  }

  if (group === 'focus') {
    return state.focused === null ? null : (state.rects[String(state.focused)] ?? null)
  }

  if (state.navActive !== null && `nav:${state.navActive.split(':')[0]}` === group) {
    return state.navRects[state.navActive] ?? null
  }

  return null
}

export function syncOverlaySlots(state: VisualState): VisualState {
  let sequence = state.overlaySequence
  let slots = [...state.overlays]
  const groups = ['hover', 'focus', 'nav:previous', 'nav:next', 'nav:previous-next']

  for (const group of groups) {
    const rect = overlayRect(state, group)

    const present = slots.find((slot) => slot.group === group && slot.present)

    if (rect === null) {
      slots = slots.map((slot) =>
        slot.group === group && slot.present
          ? { ...slot, present: false, generation: slot.generation + 1 }
          : slot,
      )
    } else if (present === undefined) {
      const reversing = group === 'focus' ? slots.find((slot) => slot.group === group) : undefined

      if (reversing === undefined) {
        sequence += 1
        slots.push({
          key: `${state.occurrence}-${group}-${sequence}`,
          group,
          rect,
          present: true,
          generation: 0,
        })
      } else {
        slots = slots.map((slot) =>
          slot.key === reversing.key
            ? { ...slot, rect, present: true, generation: slot.generation + 1 }
            : slot,
        )
      }
    } else {
      slots = slots.map((slot) => (slot.key === present.key ? { ...slot, rect } : slot))
    }
  }

  return { ...state, overlays: slots, overlaySequence: sequence }
}
