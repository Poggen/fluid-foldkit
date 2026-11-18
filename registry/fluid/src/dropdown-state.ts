/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Array, Option, Schema, Number } from 'effect'
import type { HoverMode } from './hover.js'

export const initializeDropdown: (config: DropdownConfig) => DropdownState =
  function initializeDropdown(config: DropdownConfig) {
    const inline = config.inline ?? false

    return {
      id: config.id,
      rootId: config.rootId ?? config.id,
      parentId: Option.fromNullishOr(config.parentId),
      inline,
      sub: config.sub ?? false,
      openedByHover: false,
      hoverPending: false,
      hoverGeneration: 0,
      heldIndex: Option.none(),
      disabled: config.disabled ?? false,
      control: Option.fromNullishOr(config.open),
      internalOpen: config.defaultOpen ?? false,
      phase: inline || (config.open ?? config.defaultOpen ?? false) ? 'open' : 'absent',
      generation: 0,
      mounted: false,
      restoreFocus: true,
      openingEdge: 'first',
      rows: [],
      focusedId: Option.none(),
      litBy: 'open',
      search: '',
      searchGeneration: 0,
      typeaheadOrigin: -1,
      typeaheadMatch: Option.none(),
      checkedIndex: Option.fromNullishOr(config.checkedIndex),
      checkedIndices: Option.fromNullishOr(config.checkedIndices),
    }
  }

export const transitionDropdown: (model: DropdownState, open: boolean) => DropdownState =
  function transitionDropdown(model: DropdownState, open: boolean) {
    if (model.inline || open === (model.phase === 'open')) {
      return model
    }

    return modifyFields(model, {
      phase: () => (open ? 'open' : 'closing'),
      generation: Number.increment,
      openedByHover: () => false,
      hoverPending: () => false,
      hoverGeneration: Number.increment,
      focusedId: (currentFocusedId) => (open ? Option.none() : currentFocusedId),
      litBy: (currentLitBy) => (open ? 'open' : currentLitBy),
      restoreFocus: (currentRestoreFocus) => (open ? true : currentRestoreFocus),
      search: () => '',
      searchGeneration: Number.increment,
      typeaheadMatch: () => Option.none(),
    })
  }

export const requestDropdown: (model: DropdownState, open: boolean) => DropdownState =
  function requestDropdown(model: DropdownState, open: boolean) {
    if (Option.isSome(model.control)) {
      return model
    }

    return transitionDropdown(modifyFields(model, { internalOpen: () => open }), open)
  }

export const configureDropdown: (
  model: DropdownState,
  control: typeof DropdownControl.Type,
) => DropdownState = function configureDropdown(
  model: DropdownState,
  control: typeof DropdownControl.Type,
) {
  return transitionDropdown(
    modifyFields(model, { control: () => control }),
    Option.getOrElse(control, () => model.internalOpen),
  )
}

export const completeDropdownExit: (model: DropdownState, generation: number) => DropdownState =
  function completeDropdownExit(model: DropdownState, generation: number) {
    return model.phase === 'closing' && model.generation === generation
      ? modifyFields(model, { phase: () => 'absent', focusedId: () => Option.none() })
      : model
  }

export const reconcileDropdownRows: (
  model: DropdownState,
  rows: ReadonlyArray<DropdownRow>,
) => DropdownState = function reconcileDropdownRows(
  model: DropdownState,
  rows: ReadonlyArray<DropdownRow>,
) {
  return modifyFields(model, {
    rows: () => rows,
    focusedId: (currentFocusedId) =>
      currentFocusedId.pipe(Option.filter((id) => rows.some((row) => row.id === id))),
  })
}

export const dropdownNavigationTarget: (
  model: DropdownState,
  key: string,
  searchId: string | undefined,
) => string | undefined = function dropdownNavigationTarget(
  model: DropdownState,
  key: string,
  searchId: string | undefined,
) {
  const focused = Option.getOrUndefined(model.focusedId)
  return Array.match(model.rows, {
    onEmpty: () => searchId,
    onNonEmpty: (rows) => {
      if (key === 'Home') {
        return navigationEdge(rows, true)
      }

      if (key === 'End') {
        return navigationEdge(rows, false)
      }

      const direction = navigationDirection(key, model.inline)

      if (direction === 0) {
        return undefined
      }

      const down = direction === 1

      if (focused === searchId && searchId !== undefined) {
        return navigationEdge(rows, down)
      }

      const current = rows.findIndex((row) => row.id === focused)

      if (current === -1) {
        return navigationEdge(rows, down)
      }

      const target = rows[current + direction]

      if (target !== undefined) {
        return target.id
      }

      if (searchId !== undefined) {
        return searchId
      }

      return navigationEdge(rows, down)
    },
  })
}

export const advanceDropdownTypeahead: (
  model: DropdownState,
  character: string,
) => DropdownTypeaheadChange = function advanceDropdownTypeahead(
  model: DropdownState,
  character: string,
) {
  const isNewSession = model.search === ''

  let origin = isNewSession
    ? model.rows.findIndex((row) => Option.contains(model.focusedId, row.id))
    : model.typeaheadOrigin

  let { search } = model

  const rapid = model.rows.every(
    (row) =>
      !row.available ||
      row.label === '' ||
      row.label[0]?.toLowerCase() !== row.label[1]?.toLowerCase(),
  )

  if (rapid && search === character) {
    search = ''
    origin = Option.getOrElse(model.typeaheadMatch, () => -1)
  }

  search += character

  const count = model.rows.length

  let matched: number | undefined

  for (let offset = 0; offset < count; offset += 1) {
    const index = (((origin + 1 + offset) % count) + count) % count

    const row = model.rows[index]

    if (row?.available === true && row.label.toLowerCase().startsWith(search.toLowerCase())) {
      matched = index
      break
    }
  }

  const target = matched === undefined ? undefined : model.rows[matched]?.id

  return {
    model: modifyFields(model, {
      search: () => (matched === undefined && character !== ' ' ? '' : search),
      typeaheadOrigin: () => origin,
      typeaheadMatch: (currentTypeaheadMatch) =>
        matched === undefined ? currentTypeaheadMatch : Option.some(matched),
    }),
    target: target === Option.getOrUndefined(model.focusedId) ? undefined : target,
  }
}

export const DropdownIndex = Schema.Union([Schema.Finite, Schema.NumberFromString])

export const DropdownPhase = Schema.Literals(['absent', 'open', 'closing'])

export const DropdownControl = Schema.OptionFromNullOr(Schema.Boolean)

export const DropdownRow = Schema.Struct({
  id: Schema.String,
  index: DropdownIndex,
  label: Schema.String,
  disabled: Schema.Boolean,
  available: Schema.Boolean,
  kind: Schema.Literals(['action', 'radio', 'checkbox', 'submenu']),
  checked: Schema.Boolean,
  closeOnClick: Schema.Boolean,
})

export type DropdownRow = typeof DropdownRow.Type

export const DropdownSelection = Schema.Struct({
  checkedIndex: Schema.OptionFromNullOr(DropdownIndex),
  checkedIndices: Schema.OptionFromNullOr(Schema.Array(DropdownIndex)),
})

export type DropdownSelection = typeof DropdownSelection.Type

export const DropdownState = Schema.Struct({
  id: Schema.String,
  rootId: Schema.String,
  parentId: Schema.OptionFromNullOr(Schema.String),
  inline: Schema.Boolean,
  sub: Schema.Boolean,
  hoverPending: Schema.Boolean,
  openedByHover: Schema.Boolean,
  hoverGeneration: Schema.Natural,
  heldIndex: Schema.OptionFromNullOr(DropdownIndex),
  disabled: Schema.Boolean,
  control: DropdownControl,
  internalOpen: Schema.Boolean,
  phase: DropdownPhase,
  generation: Schema.Natural,
  mounted: Schema.Boolean,
  restoreFocus: Schema.Boolean,
  openingEdge: Schema.Literals(['first', 'last']),
  rows: Schema.Array(DropdownRow),
  focusedId: Schema.OptionFromNullOr(Schema.String),
  litBy: Schema.Literals(['open', 'pointer', 'keyboard']),
  search: Schema.String,
  searchGeneration: Schema.Natural,
  typeaheadOrigin: Schema.Int,
  typeaheadMatch: Schema.OptionFromNullOr(Schema.Natural),
  ...DropdownSelection.fields,
})

export type DropdownState = typeof DropdownState.Type

export interface DropdownConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly rootId?: string
  readonly parentId?: string
  readonly open?: boolean
  readonly defaultOpen?: boolean
  readonly disabled?: boolean
  readonly inline?: boolean
  readonly sub?: boolean
  readonly checkedIndex?: number
  readonly checkedIndices?: ReadonlyArray<number>
}

const navigationEdge = (rows: ReadonlyArray<DropdownRow>, down: boolean) =>
  down ? rows[0]?.id : rows.at(-1)?.id

const navigationDirection = (key: string, inline: boolean) => {
  if (key === 'ArrowDown' || (inline && key === 'ArrowRight')) {
    return 1
  }

  if (key === 'ArrowUp' || (inline && key === 'ArrowLeft')) {
    return -1
  }

  return 0
}

interface DropdownTypeaheadChange {
  readonly model: DropdownState
  readonly target: string | undefined
}

export interface DropdownSubConfig extends DropdownConfig {
  readonly rootId: string
  readonly parentId: string
}
