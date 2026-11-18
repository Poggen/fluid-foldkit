/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Layer, Option, Schema, Number } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  DropdownState,
  DropdownIndex,
  DropdownRow,
  DropdownSelection,
  DropdownControl,
  initializeDropdown,
  requestDropdown,
  configureDropdown,
  completeDropdownExit,
  reconcileDropdownRows,
  dropdownNavigationTarget,
  advanceDropdownTypeahead,
} from './dropdown-state.js'
import type { DropdownConfig } from './dropdown-state.js'
const Model = DropdownState
const Message = Schema.Never
export const InMessage = defineInMessageUnion({
  RequestedOpen: { open: Schema.Boolean },
  RequestedDismiss: {
    restore: Schema.Boolean,
    reason: Schema.Literals(['escape', 'outside', 'focus', 'tab', 'left']),
  },
  RequestedTriggerHover: { over: Schema.Boolean, openOnHover: Schema.optionalKey(Schema.Boolean) },
  InformedOfHoverCompletion: { generation: Schema.Natural },
  RequestedSubmenuHold: { index: DropdownIndex, open: Schema.Boolean },
  RequestedOpenWithKey: { key: Schema.String },
  RequestedControlledOpen: { control: DropdownControl },
  RequestedDisabled: { disabled: Schema.Boolean },
  RequestedSelection: { selection: DropdownSelection },
  InformedOfRows: { rows: Schema.Array(DropdownRow) },
  InformedOfFocus: { id: Schema.OptionFromNullOr(Schema.String) },
  RequestedNavigate: { key: Schema.String, searchId: Schema.OptionFromNullOr(Schema.String) },
  RequestedTypeahead: { character: Schema.String },
  InformedOfTypeaheadCompletion: { generation: Schema.Natural },
  RequestedActivate: { id: Schema.String },
  InformedOfExitCompletion: { generation: Schema.Natural },
  InformedOfMount: {},
  InformedOfPointer: {},
})
const OutMessage = defineMessageUnion({
  OpenChanged: { open: Schema.Boolean },
  FocusRequested: { id: Schema.String },
  Activated: {
    id: Schema.String,
    index: DropdownIndex,
    close: Schema.Boolean,
    root: Schema.Boolean,
  },
  RootCloseRequested: {},
  HoverRequested: { generation: Schema.Natural },
  TypeaheadChanged: { generation: Schema.Natural, target: Schema.OptionFromNullOr(Schema.String) },
})
const Config = Schema.Struct({
  id: Schema.String,
  rootId: Schema.optionalKey(Schema.String),
  parentId: Schema.optionalKey(Schema.String),
  open: Schema.optionalKey(Schema.Boolean),
  defaultOpen: Schema.optionalKey(Schema.Boolean),
  disabled: Schema.optionalKey(Schema.Boolean),
  inline: Schema.optionalKey(Schema.Boolean),
  sub: Schema.optionalKey(Schema.Boolean),
  checkedIndex: Schema.optionalKey(DropdownIndex),
  checkedIndices: Schema.optionalKey(Schema.Array(DropdownIndex)),
})
const effects = Block.makeEffectsContract()
export const DropdownControllerKey = Symbol('DropdownController')
export const DropdownControllerBlock = Block.make('DropdownController', {
  key: DropdownControllerKey,
  isMessageFree: true,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  effects,
  inMessageOutputs: {
    RequestedOpen: { outMessage: OutMessage.OpenChanged },
    RequestedOpenWithKey: { outMessage: OutMessage.OpenChanged },
    RequestedDismiss: {
      outMessage: Schema.Union([OutMessage.OpenChanged, OutMessage.RootCloseRequested]),
    },
    RequestedTriggerHover: {
      outMessage: Schema.Union([OutMessage.HoverRequested, OutMessage.OpenChanged]),
    },
    InformedOfHoverCompletion: { outMessage: OutMessage.OpenChanged },
    RequestedNavigate: { outMessage: OutMessage.FocusRequested },
    RequestedTypeahead: { outMessage: OutMessage.TypeaheadChanged },
    RequestedActivate: { outMessage: OutMessage.Activated },
  },
})
const DropdownControllerComposition = DropdownControllerBlock.makeComposition()
const init = DropdownControllerComposition.makeInit((config: DropdownConfig) => ({
  model: initializeDropdown(config),
}))
const inMessageUpdate = DropdownControllerComposition.makeInMessageUpdate({
  RequestedOpen: (model, { open }) => ({
    model: requestDropdown(modifyFields(model, { openedByHover: () => false }), open),
    outMessage: OutMessage.OpenChanged({ open }),
  }),
  RequestedOpenWithKey: (model, { key }) =>
    model.disabled
      ? { model }
      : {
          model: {
            ...requestDropdown(
              modifyFields(model, {
                openedByHover: () => false,
                openingEdge: () => (key === 'ArrowUp' ? 'last' : 'first'),
              }),
              true,
            ),
            litBy: 'keyboard',
          },
          outMessage: OutMessage.OpenChanged({ open: true }),
        },
  RequestedDismiss: (model, { restore }) => ({
    model: requestDropdown(modifyFields(model, { restoreFocus: () => restore }), false),
    outMessage: OutMessage.OpenChanged({ open: false }),
  }),
  RequestedTriggerHover: (model, { over, openOnHover }) => {
    if (!model.sub && openOnHover && !model.disabled) {
      if (over && model.phase !== 'open')
        return {
          model: modifyFields(requestDropdown(model, true), {
            openedByHover: () => true,
            restoreFocus: () => false,
          }),
          outMessage: OutMessage.OpenChanged({ open: true }),
        }
      if (over)
        return {
          model: modifyFields(model, {
            hoverPending: () => false,
            hoverGeneration: Number.increment,
          }),
        }
      if (model.openedByHover && model.phase === 'open') {
        const generation = model.hoverGeneration + 1
        return {
          model: modifyFields(model, {
            hoverPending: () => true,
            hoverGeneration: () => generation,
          }),
          outMessage: OutMessage.HoverRequested({ generation }),
        }
      }
      return { model }
    }
    if (!model.sub || model.disabled || (over && (model.hoverPending || model.phase === 'open'))) {
      return { model }
    }
    const generation = model.hoverGeneration + 1
    const next = {
      model: modifyFields(model, { hoverPending: () => over, hoverGeneration: () => generation }),
    }
    return over ? { ...next, outMessage: OutMessage.HoverRequested({ generation }) } : next
  },
  InformedOfHoverCompletion: (model, { generation }) =>
    generation === model.hoverGeneration && model.hoverPending && !model.disabled
      ? {
          model: requestDropdown(modifyFields(model, { hoverPending: () => false }), model.sub),
          outMessage: OutMessage.OpenChanged({ open: model.sub }),
        }
      : { model },
  RequestedSubmenuHold: (model, { index, open }) => ({
    model: modifyFields(model, {
      heldIndex: (currentHeldIndex) =>
        open ? Option.some(index) : currentHeldIndex.pipe(Option.filter((held) => held !== index)),
    }),
  }),
  RequestedControlledOpen: (model, { control }) => ({ model: configureDropdown(model, control) }),
  RequestedDisabled: (model, { disabled }) => ({
    model: modifyFields(model, { disabled: () => disabled }),
  }),
  RequestedSelection: (model, { selection }) => ({
    model: modifyFields(model, {
      checkedIndex: () => selection.checkedIndex,
      checkedIndices: () => selection.checkedIndices,
    }),
  }),
  InformedOfRows: (model, { rows }) => ({ model: reconcileDropdownRows(model, rows) }),
  InformedOfFocus: (model, { id }) => ({ model: modifyFields(model, { focusedId: () => id }) }),
  RequestedNavigate: (model, { key, searchId }) => {
    const id = dropdownNavigationTarget(model, key, Option.getOrUndefined(searchId))
    const next = { model: Model.make(modifyFields(model, { litBy: () => 'keyboard' })) }
    return id === undefined ? next : { ...next, outMessage: OutMessage.FocusRequested({ id }) }
  },
  RequestedTypeahead: (model, { character }) => {
    const next = advanceDropdownTypeahead(model, character)
    const generation = model.searchGeneration + 1
    return {
      model: modifyFields(next.model, {
        searchGeneration: () => generation,
        litBy: () => 'keyboard',
      }),
      outMessage: OutMessage.TypeaheadChanged({
        generation,
        target: Option.fromNullishOr(next.target),
      }),
    }
  },
  InformedOfTypeaheadCompletion: (model, { generation }) => ({
    model:
      generation === model.searchGeneration
        ? modifyFields(model, {
            search: () => '',
            typeaheadOrigin: () => Option.getOrElse(model.typeaheadMatch, () => -1),
          })
        : model,
  }),
  RequestedActivate: (model, { id }) => {
    const row = model.rows.find((candidate) => candidate.id === id)
    if (!row || row.disabled || row.kind === 'submenu') {
      return { model }
    }
    const close = row.closeOnClick && !model.inline
    return {
      model: close
        ? requestDropdown(modifyFields(model, { restoreFocus: () => true }), false)
        : model,
      outMessage: OutMessage.Activated({
        id,
        index: row.index,
        close,
        root: close && model.sub,
      }),
    }
  },
  InformedOfExitCompletion: (model, { generation }) => ({
    model: completeDropdownExit(model, generation),
  }),
  InformedOfPointer: (model) => ({ model: modifyFields(model, { litBy: () => 'pointer' }) }),
  InformedOfMount: (model) => ({ model: modifyFields(model, { mounted: () => true }) }),
})
export const layer = DropdownControllerBlock.makeLayer({
  init,
  update: DropdownControllerComposition.makeUpdate({}),
  inMessageUpdate,
  EffectsLayer: Layer.empty,
})
