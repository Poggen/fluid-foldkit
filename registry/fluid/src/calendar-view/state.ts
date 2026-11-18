/* @license Derived from Fluid Functionalism 200b4534, MIT; see NOTICE */
import { Match, Schema } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { Month, Selection } from '../calendar-state.js'
import type { CalendarState, Projection } from '../calendar-state.js'

export const committedBand: (selection: Selection) => typeof Band.Type | null =
  function committedBand(selection: Selection) {
    return Selection.isAnyOf(['Range'])(selection) &&
      selection.from !== null &&
      selection.to !== null
      ? { from: selection.from.ordinal, to: selection.to.ordinal }
      : null
  }

export const initialVisual: (selection: Selection) => VisualState = function initialVisual(
  selection: Selection,
) {
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

export const observeVisual: (state: VisualState, observation: Observation) => VisualState =
  function observeVisual(state: VisualState, observation: Observation) {
    return Match.value(observation).pipe(
      Match.tagsExhaustive({
        Measured: (observed) =>
          modifyFields(state, {
            heightSpring: () => observed.generation !== state.measurementGeneration,
            measurementGeneration: () => observed.generation,
            heights: (current) =>
              sameHeights(current, observed.heights) ? current : observed.heights,
            navRects: (current) =>
              sameRects(current, observed.navRects) ? current : observed.navRects,
            fits: () => observed.fits,
            stride: () => observed.stride,
            rects: (current) => (sameRects(current, observed.rects) ? current : observed.rects),
            reduceMotion: () => observed.reduceMotion,
          }) satisfies VisualState,
        NavActive: (observed) =>
          modifyFields(state, { navActive: () => observed.key }) satisfies VisualState,
        Active: (observed) =>
          modifyFields(state, {
            active: () => observed.ordinal,
            focused: () => (observed.keyboard ? observed.ordinal : null),
            snap: (current) => (observed.keyboard ? current : false),
          }) satisfies VisualState,
        Pressed: (observed) =>
          modifyFields(state, {
            pressed: () => observed.value,
            focused: (current) => (observed.value ? null : current),
          }) satisfies VisualState,
        OverlayExited: (observed) =>
          modifyFields(state, {
            overlays: (current) => {
              const remaining = current.filter(
                (slot) =>
                  slot.key !== observed.key ||
                  slot.generation !== observed.generation ||
                  slot.present,
              )
              return remaining.length === current.length ? current : remaining
            },
          }) satisfies VisualState,
        PanelExited: (observed) =>
          modifyFields(state, {
            retained: (current) => {
              const remaining = current.filter((panel) => panel.key !== observed.key)
              return remaining.length === current.length ? current : remaining
            },
          }) satisfies VisualState,
        SnapReleased: () => modifyFields(state, { snap: () => false }) satisfies VisualState,
        GhostSettled: (observed) =>
          (state.ghost !== null && observed.generation === state.ghostGeneration
            ? { ...state, ghost: null }
            : state) satisfies VisualState,
        CommittedEndSettled: (observed) =>
          (state.committedEnd !== null && observed.generation === state.committedEndGeneration
            ? { ...state, committedEnd: null }
            : state) satisfies VisualState,
      }),
    )
  }

export const panelKey: (
  visual: VisualState,
  month: Projection['months'][number],
  index: number,
) => string = function panelKey(
  visual: VisualState,
  month: Projection['months'][number],
  index: number,
) {
  return `${visual.occurrence}-${visual.generation}-${index}-${month.date}`
}

export const transitionVisual: (
  visual: VisualState,
  previous: CalendarState,
  next: CalendarState,
  previousPreviewEnd: number | null,
) => VisualState = function transitionVisual(
  visual: VisualState,
  previous: CalendarState,
  next: CalendarState,
  previousPreviewEnd: number | null,
) {
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

const overlayRect: (state: VisualState, group: string) => typeof Rect.Type | null =
  function overlayRect(state: VisualState, group: string) {
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

export const syncOverlaySlots: (state: VisualState) => VisualState = function syncOverlaySlots(
  state: VisualState,
) {
  let sequence = state.overlaySequence
  let slots = state.overlays
  const groups = ['hover', 'focus', 'nav:previous', 'nav:next', 'nav:previous-next']

  for (const group of groups) {
    const rect = overlayRect(state, group)

    const present = slots.find((slot) => slot.group === group && slot.present)

    if (rect === null && present !== undefined) {
      slots = slots.map((slot) =>
        slot.group === group && slot.present
          ? { ...slot, present: false, generation: slot.generation + 1 }
          : slot,
      )
    } else if (rect !== null && present === undefined) {
      const reversing = group === 'focus' ? slots.find((slot) => slot.group === group) : undefined

      if (reversing === undefined) {
        sequence += 1
        slots = [
          ...slots,
          {
            key: `${state.occurrence}-${group}-${sequence}`,
            group,
            rect,
            present: true,
            generation: 0,
          },
        ]
      } else {
        slots = slots.map((slot) =>
          slot.key === reversing.key
            ? { ...slot, rect, present: true, generation: slot.generation + 1 }
            : slot,
        )
      }
    } else if (rect !== null && present !== undefined && !sameRect(present.rect, rect)) {
      slots = slots.map((slot) => (slot.key === present.key ? { ...slot, rect } : slot))
    }
  }

  return modifyFields(state, { overlays: () => slots, overlaySequence: () => sequence })
}

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

const sameRect = Schema.toEquivalence(Rect)
const sameRects = Schema.toEquivalence(VisualState.fields.rects)
const sameHeights = Schema.toEquivalence(VisualState.fields.heights)
