import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
import { Schema } from 'effect'
import { nearestSlotIndex, parseTime } from './date-picker-format.js'

export const TimeSlotData = Schema.Struct({
  minutes: Schema.Finite,
  label: Schema.String,
  duration: Schema.NullOr(Schema.Finite),
})

export const TimeFieldConfig = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  value: Schema.NullOr(Schema.Finite),
  display: Schema.String,
  slots: Schema.Array(TimeSlotData),
  widestLabels: Schema.Array(Schema.String),
  fallback: Schema.Finite,
  disabled: Schema.Boolean,
  label: Schema.String,
  placeholder: Schema.String,
})

export const TimeFieldState = Schema.Struct({
  config: TimeFieldConfig,
  open: Schema.Boolean,
  draft: Schema.NullOr(Schema.String),
  activeIndex: Schema.NullOr(Schema.Int),
  openTarget: Schema.NullOr(Schema.Int),
})

export type TimeFieldState = typeof TimeFieldState.Type

export const TimeFieldAction = Schema.TaggedUnion({
  Opened: {},
  Dismissed: {},
  Blurred: { staysInList: Schema.Boolean },
  Typed: { value: Schema.String },
  KeyDown: { key: Schema.String },
  Picked: { index: Schema.Int },
  Highlighted: { index: Schema.NullOr(Schema.Int) },
  Configured: { config: TimeFieldConfig },
})

export type TimeFieldAction = typeof TimeFieldAction.Type

export function transitionTimeField(input: TimeFieldState, action: TimeFieldAction) {
  let state = input
  let committed: number | null = null
  let scroll: 'center' | 'nearest' | null = null
  let preventDefault = false
  let stopPropagation = false
  const slots = state.config.slots

  const selected =
    state.config.value === null
      ? -1
      : slots.findIndex((slot) => slot.minutes === state.config.value)

  const first = slots[0]
  const floor = first && first.duration !== null ? first.minutes - first.duration : -1

  const nearest = (minutes: number) => {
    const index = nearestSlotIndex(slots, minutes)

    return index < 0 ? null : index
  }

  const open = () => {
    if (state.config.disabled || state.open) return
    const target = selected >= 0 ? selected : nearest(state.config.fallback)
    state = modifyFields(state, {
      open: () => true,
      activeIndex: () => target,
      openTarget: () => target,
    })
    scroll = 'center'
  }

  const close = () => {
    state = modifyFields(state, { open: () => false, draft: () => null, activeIndex: () => null })
  }

  const commitDraft = () => {
    if (state.draft === null) return
    const parsed = parseTime(state.draft)

    if (parsed !== null && parsed > floor) committed = parsed
    state = modifyFields(state, { draft: () => null })
  }

  TimeFieldAction.match(action, {
    Opened: (_action) => {
      open()
      return
    },
    Dismissed: (_action) => {
      commitDraft()
      close()
      return
    },
    Blurred: (action) => {
      if (!action.staysInList) {
        commitDraft()
        close()
      }
      return
    },
    Typed: (action) => {
      state = modifyFields(state, { draft: () => action.value, open: () => true })
      const parsed = parseTime(action.value)
      if (parsed !== null) {
        state = modifyFields(state, { activeIndex: () => nearest(parsed) })
        scroll = 'center'
      }
      return
    },
    Highlighted: (action) => {
      state = modifyFields(state, { activeIndex: () => action.index })
      return
    },
    Picked: (action) => {
      const slot = slots[action.index]
      if (slot) {
        committed = slot.minutes
        close()
      }
      return
    },
    Configured: (action) => {
      state = modifyFields(state, { config: () => action.config })
      return
    },
    KeyDown: (action) => {
      if (action.key === 'ArrowDown' || action.key === 'ArrowUp') {
        preventDefault = true
        // Explicit frozen-source defect correction approved by Root: an empty
        // list has no navigation target; retain open/draft/value/focus state.
        if (slots.length === 0) return
        if (!state.open) {
          open()
          return
        }
        const direction = action.key === 'ArrowDown' ? 1 : -1
        const index = Math.min(
          Math.max((state.activeIndex ?? selected) + direction, 0),
          slots.length - 1,
        )
        const slot = slots[index]
        if (slot) {
          state = modifyFields(state, { activeIndex: () => index, draft: () => slot.label })
          scroll = 'nearest'
        }
      } else if (action.key === 'Enter') {
        preventDefault = true
        if (state.draft !== null && parseTime(state.draft) !== null) commitDraft()
        else if (state.activeIndex !== null) committed = slots[state.activeIndex]?.minutes ?? null
        close()
      } else if (action.key === 'Escape' && (state.open || state.draft !== null)) {
        preventDefault = true
        stopPropagation = true
        close()
      }
      return
    },
  })

  return { state, committed, scroll, preventDefault, stopPropagation }
}
