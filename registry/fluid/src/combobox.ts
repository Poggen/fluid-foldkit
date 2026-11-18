/* @license Derived from Fluid Functionalism200b4534. MIT, copyright2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Array, Layer, Option } from 'effect'
import { Update } from 'foldkit'
import {
  ComboboxBlock,
  dependencies,
  OutMessage,
  Definition,
  Composition,
  Popup,
  Hover,
  Selection,
  ObserveField,
  restQuery,
  closeCombobox,
  comboboxValues,
  comboboxFilterQuery,
} from './combobox-definition.js'
import type { ComboboxConfig, Message, InMessage } from './combobox-definition.js'
import { view } from './combobox-view.js'
import { reconcileComboboxChips } from './combobox-chips.js'
import type { SelectOption } from './select.js'
export type { ComboboxConfig } from './combobox-definition.js'
export type { ComboboxViewInputs } from './combobox-view.js'
export { createSelectLayer as createComboboxLayer } from './select.js'
const init = Composition.makeInit((config: ComboboxConfig) => {
  const values = comboboxValues(config.value === undefined ? config.defaultValue : config.value)
  if (config.items.some((item) => item.value === '\u0000create')) {
    throw new Error('The create-row value is reserved')
  }
  return {
    childInitContext: config,
    model: {
      id: config.id,
      items: config.items,
      values,
      initialValues: comboboxValues(config.defaultValue),
      controlled: config.value !== undefined,
      multiple: config.multiple ?? false,
      disabled: config.disabled ?? false,
      hideSelected: config.hideSelected ?? false,
      allowCreate: config.allowCreate ?? false,
      openingLast: false,
      chips: values.flatMap((value) => {
        const item = config.items.find((entry) => entry.value === value)
        return item === undefined
          ? []
          : [{ value, label: item.label, present: true, generation: 0, initial: true, rect: null }]
      }),
      chipGeneration: 0,
      fieldHeight: Option.none(),
      fieldWidth: 0,
      query:
        config.multiple === true
          ? ''
          : (config.items.find((item) => item.value === values[0])?.label ?? ''),
      open: false,
      closingQuery: Option.none(),
      activeIndex: Option.none(),
      visibleValues: [],
    },
  }
})
const selectValues = (
  values: ReadonlyArray<string>,
  close: boolean,
  items?: ReadonlyArray<SelectOption>,
  clearHighlight = false,
) =>
  Definition.makeStep((model) => {
    const accepted = model.controlled ? model.values : values
    const steps = Update.combineSteps([
      Definition.makeFieldsStep(() => ({
        items: () => items ?? model.items,
        values: () => accepted,
        chips: () =>
          reconcileComboboxChips(
            model.chips,
            accepted,
            items ?? model.items,
            model.chipGeneration + 1,
          ),
        chipGeneration: () => model.chipGeneration + 1,
        query: () =>
          restQuery(
            modifyFields(model, { items: (currentItems) => items ?? currentItems }),
            accepted,
          ),
        activeIndex: () => (close || clearHighlight ? Option.none() : model.activeIndex),
      })),
      Selection.requestSelection({
        indices: model.visibleValues.flatMap((value, index) =>
          accepted.includes(value) ? [index] : [],
        ),
      }),
      ...(close
        ? [closeCombobox(comboboxFilterQuery(model))]
        : [
            Hover.requestHighlight({
              index: clearHighlight ? null : Option.getOrNull(model.activeIndex),
            }),
          ]),
    ])
    return (registered: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(
        steps(registered),
        model.multiple
          ? OutMessage.ValuesChanged({ values })
          : OutMessage.Selected({ value: Option.fromUndefinedOr(values[0]) }),
      )
  })
const commitValue = (value: string) =>
  Definition.makeStep((model) => {
    if (model.disabled) {
      return Definition.makeNoopStep()
    }
    if (value === '\u0000create') {
      const event = OutMessage.CreateRequested({ query: model.query.trim() })
      const close = closeCombobox()
      return (registered: Parameters<typeof close>[0]) =>
        Update.withOutMessage(close(registered), event)
    }
    const item = model.items.find((entry) => entry.value === value)
    if (item === undefined || item.disabled === true) {
      return Definition.makeNoopStep()
    }
    let values: ReadonlyArray<string> = [value]
    if (model.multiple) {
      values = model.values.includes(value)
        ? model.values.filter((entry) => entry !== value)
        : [...model.values, value]
    }
    const filtering = model.query.trim() !== ''
    return selectValues(values, !model.multiple || filtering)
  })
const update = Composition.makeUpdate({
  MeasuredChips: (model, { height, width, chips }) => ({
    model: modifyFields(model, {
      fieldHeight: () => Option.some(height),
      fieldWidth: () => width,
      chips: (currentChips) =>
        currentChips.map((chip) => {
          const rect = chips.find((item) => item.value === chip.value)
          return rect === undefined ? chip : { ...chip, rect }
        }),
    }),
  }),
  ChipExited: (model, { value, generation }) => ({
    model: modifyFields(model, {
      chips: (currentChips) =>
        currentChips.filter(
          (chip) => chip.value !== value || chip.present || chip.generation !== generation,
        ),
    }),
  }),
  OpenedByField: Definition.makeStep((model) =>
    model.disabled
      ? Definition.makeNoopStep()
      : Update.combineSteps([
          Definition.makeFieldsStep(() => ({
            open: () => true,
            closingQuery: () => Option.none(),
          })),
          Popup.requestVisibility({ open: true }),
        ]),
  ),
  Navigated: Definition.makeStep((model, { key }: typeof Message.Navigated.Type) => {
    if (model.disabled) {
      return Definition.makeNoopStep()
    }
    if (!model.open) {
      return Update.combineSteps([
        Definition.makeFieldsStep(() => ({
          open: () => true,
          closingQuery: () => Option.none(),
          openingLast: () => key === 'ArrowUp',
        })),
        Popup.requestVisibility({ open: true }),
      ])
    }
    const available = model.visibleValues.flatMap((value, index) =>
      model.items.find((item) => item.value === value)?.disabled === true ? [] : [index],
    )
    const current = available.indexOf(Option.getOrElse(model.activeIndex, () => -1))
    let next = available.length - 1
    if (key === 'Home') {
      next = 0
    } else if (key === 'End') {
      next = available.length - 1
    } else if (key === 'ArrowDown') {
      next = (current + 1) % available.length
    } else if (current !== -1) {
      next = (current - 1 + available.length) % available.length
    }
    const index = available[next] ?? null
    return Update.combineSteps([
      Definition.makeFieldsStep(() => ({ activeIndex: () => Option.fromNullishOr(index) })),
      Hover.requestHighlight({ index }),
    ])
  }),
  ClosedByField: closeCombobox(),
  RequestedReset: Definition.makeStep((model) => {
    const values = model.controlled ? model.values : model.initialValues
    return Update.combineSteps([
      Definition.makeFieldsStep(() => ({
        values: () => values,
        chips: () =>
          reconcileComboboxChips(model.chips, values, model.items, model.chipGeneration + 1),
        chipGeneration: () => model.chipGeneration + 1,
        query: () => restQuery(model, values),
      })),
      closeCombobox(comboboxFilterQuery(model)),
    ])
  }),
  Activated: Definition.makeStep((_model, { index }: typeof Message.Activated.Type) =>
    Update.combineSteps([
      Definition.makeFieldsStep(() => ({ activeIndex: () => Option.fromNullishOr(index) })),
      Hover.requestHighlight({ index }),
    ]),
  ),
  Inputted: Definition.makeStep((model, { query }: typeof Message.Inputted.Type) =>
    model.disabled
      ? Definition.makeNoopStep()
      : Update.combineSteps([
          Definition.makeFieldsStep(() => ({
            query: () => query,
            open: () => true,
            closingQuery: () => Option.none(),
            activeIndex: () => Option.none(),
          })),
          ...(model.popup.open && model.popup.retained
            ? []
            : [Popup.requestVisibility({ open: true })]),
          ...(model.hover.activeIndex === null ? [] : [Hover.requestHighlight({ index: null })]),
        ]),
  ),
  Entered: Definition.makeStep((model) => {
    const value = Option.isSome(model.activeIndex)
      ? model.visibleValues[model.activeIndex.value]
      : undefined
    return model.open && value !== undefined ? commitValue(value) : Definition.makeNoopStep()
  }),
  Committed: Definition.makeStep((_model, { value }: typeof Message.Committed.Type) =>
    commitValue(value),
  ),
  Backspaced: Definition.makeStep(
    (model, { renderedChipsCount }: typeof Message.Backspaced.Type) => {
      if (model.disabled || !model.multiple) {
        return Definition.makeNoopStep()
      }
      return Array.match(model.values, {
        onEmpty: () => Definition.makeNoopStep(),
        onNonEmpty: (values) => {
          const index = renderedChipsCount > 0 ? renderedChipsCount - 1 : values.length - 1
          return selectValues(
            Array.filter(values, (_, position) => position !== index),
            false,
            undefined,
            true,
          )
        },
      })
    },
  ),
  Removed: Definition.makeStep((model, { value }: typeof Message.Removed.Type) =>
    model.disabled
      ? Definition.makeNoopStep()
      : selectValues(
          model.values.filter((entry) => entry !== value),
          false,
        ),
  ),
  Cleared: Definition.makeStep((model) =>
    model.disabled ? Definition.makeNoopStep() : selectValues([], false),
  ),
})
const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedHoverMode: Definition.makeStep(
    (_model, { mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Hover.requestConfigure({
        options: { mode, axis: 'y', nearest: true, gapClick: true, maxDistance: Infinity },
      }),
  ),
  RequestedConfigure: Definition.makeStep(
    (model, config: typeof InMessage.RequestedConfigure.Type) => {
      if (config.items.some((item) => item.value === '\u0000create')) {
        throw new Error('The create-row value is reserved')
      }
      const controlled = config.value !== undefined
      const multiple = config.multiple ?? model.multiple
      const requestedValues = controlled ? comboboxValues(config.value) : model.values
      const values = multiple ? requestedValues : requestedValues.slice(0, 1)
      return Update.combineSteps([
        Definition.makeFieldsStep(() => ({
          multiple: () => multiple,
          items: () => config.items,
          values: () => values,
          chips: () =>
            reconcileComboboxChips(model.chips, values, config.items, model.chipGeneration + 1),
          chipGeneration: () => model.chipGeneration + 1,
          controlled: () => controlled,
          disabled: () => config.disabled ?? model.disabled,
          hideSelected: () => config.hideSelected ?? model.hideSelected,
          allowCreate: () => config.allowCreate ?? model.allowCreate,
          query: () => {
            if (model.open) {
              return model.query
            }
            if (multiple) {
              return ''
            }
            return config.items.find((item) => item.value === values[0])?.label ?? ''
          },
        })),
        Selection.requestSelection({
          indices: model.visibleValues.flatMap((value, index) =>
            values.includes(value) ? [index] : [],
          ),
        }),
        ...(config.disabled === true ? [closeCombobox()] : []),
      ])
    },
  ),
  RequestedAcceptCreated: Definition.makeStep(
    (model, { item }: typeof InMessage.RequestedAcceptCreated.Type) => {
      if (item.value === '\u0000create') {
        throw new Error('The create-row value is reserved')
      }
      const items = model.items.some((entry) => entry.value === item.value)
        ? model.items
        : [...model.items, item]
      const values = model.multiple ? [...new Set([...model.values, item.value])] : [item.value]
      return selectValues(values, false, items)
    },
  ),
  RequestedOpen: Definition.makeStep((model) =>
    model.disabled
      ? Definition.makeNoopStep()
      : Update.combineSteps([
          Definition.makeFieldsStep(() => ({
            open: () => true,
            closingQuery: () => Option.none(),
          })),
          Popup.requestVisibility({ open: true }),
        ]),
  ),
  RequestedClose: closeCombobox(),
})
export { ComboboxBlock } from './combobox-definition.js'
export const layer = ComboboxBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: ObserveField.layer,
}).pipe(Layer.provide(dependencies))

export const hoverModeOf = (model: typeof ComboboxBlock.Model.Type) => model.hover.mode
