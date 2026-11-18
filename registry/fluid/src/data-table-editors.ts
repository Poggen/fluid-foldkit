import { childAttributes } from 'foldkit/html'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import { DateTime, Effect, Layer, Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { InputBlock, layer as InputLayer } from './input.js'
import { SelectBlock, layer as SelectLayer } from './select.js'
import { ComboboxBlock, layer as ComboboxLayer } from './combobox.js'
import { DatePickerBlock, layer as PickerLayer } from './date-picker.js'
import { DatePickerPresentation, prepareDatePicker } from './date-picker-config.js'
import { DefaultCalendarEnvironment } from './calendar-environment.js'
import { Button } from './button.js'
import {
  DataTableEditorsBlock,
  Edit,
  Message,
  OutMessage,
} from './data-table-editors-definition.js'
import type { DataTableValue } from './data-table-editor-value.js'
export { DataTableEditorsBlock } from './data-table-editors-definition.js'
export type { DataTableEditorsInputs } from './data-table-editors-definition.js'

const Root = DataTableEditorsBlock
const setValue = (value: DataTableValue, commit = false) =>
  Root.makeStep((model) =>
    Update.withOutMessage(
      {
        model: modifyFields(model, {
          active: (active) => Option.map(active, (edit) => ({ ...edit, value })),
        }),
      },
      commit ? OutMessage.Committed({ value }) : OutMessage.DraftChanged({ value }),
    ),
  )
const InputRequests = Root.makeOptionalFieldBinding(InputBlock, { field: 'input' })
const Input = InputRequests.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(InputBlock, {
    Changed: ({ value }) =>
      Root.makeStep((model) => {
        const numeric = Option.getOrUndefined(model.active)?.editor.type === 'number'
        const parsed = numeric ? (value.trim() === '' ? null : Number(value)) : value
        if (typeof parsed === 'number' && !Number.isFinite(parsed)) return Root.makeNoopStep()
        const steps = Update.combineSteps([
          InputRequests.requestConfigure({ value, disabled: false, readOnly: false }),
          Root.makeFieldsStep(() => ({
            active: (active) => Option.map(active, (edit) => ({ ...edit, value: parsed })),
          })),
        ])
        return (registered: Parameters<typeof steps>[0]) =>
          Update.withOutMessage(steps(registered), OutMessage.DraftChanged({ value: parsed }))
      }),
    FilesChanged: Root.makeNoopStep,
  }),
})
const Select = Root.makeOptionalFieldBinding(SelectBlock, { field: 'select' }).withOutMessagePolicy(
  {
    fold: Root.makeOutMessageFold(SelectBlock, {
      Selected: ({ value }) => setValue(value, true),
      OpenChanged: Root.makeNoopStep,
    }),
  },
)
const TagsRequests = Root.makeOptionalFieldBinding(ComboboxBlock, { field: 'tags' })
const Tags = TagsRequests.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(ComboboxBlock, {
    Selected: Root.makeNoopStep,
    ValuesChanged: ({ values }) => setValue(values),
    CreateRequested: ({ query }) =>
      TagsRequests.requestAcceptCreated({ item: { value: query.trim(), label: query.trim() } }),
  }),
})
const Picker = Root.makeOptionalFieldBinding(DatePickerBlock, {
  field: 'picker',
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DatePickerBlock, {
    Transitioned: ({ notices }) =>
      Root.makeStep(() => {
        const changed = notices.find(
          (notice) => notice._tag === 'Picker' && notice.event._tag === 'ValueChanged',
        )
        if (changed?._tag !== 'Picker' || changed.event._tag !== 'ValueChanged')
          return Root.makeNoopStep()
        const selected = changed.event.value
        // Calendar ordinals retain the chosen civil day across local-midnight offsets.
        return setValue(
          selected._tag === 'Single'
            ? DateTime.formatIso(DateTime.makeUnsafe(selected.date.ordinal * 86_400_000)).slice(
                0,
                10,
              )
            : null,
          true,
        )
      }),
  }),
})
const Composition = Root.makeComposition({ bindings: [Input, Select, Tags, Picker] })
const PrepareDate = Root.makeCommand('PrepareDate', {
  args: {
    generation: Message.PreparedDate.fields.generation,
    id: Root.Model.fields.id,
    value: Edit,
  },
  messages: [Message.PreparedDate],
  *handler() {
    return ({ generation, id, value }) =>
      Effect.gen(function* () {
        const raw = value?.value
        const date =
          typeof raw === 'string'
            ? Option.getOrUndefined(
                Option.map(DateTime.make(`${raw.slice(0, 10)}T12:00:00Z`), DateTime.toDateUtc),
              )
            : undefined
        const prepared = yield* prepareDatePicker(
          { id: `${id}-date`, mode: 'single', defaultValue: date },
          DatePickerPresentation.make({
            compact: true,
            disabled: false,
            variant: 'ghost',
            orientation: 'auto',
            numberOfMonths: 1,
            cellSize: 32,
            showWeekNumber: false,
            locale: 'en-US',
            hourCycle: 24,
            step: 1,
            triggerId: null,
            placeholder: 'Choose date',
            name: null,
            ariaLabel: 'Cell date',
            clearable: true,
            className: '',
            required: false,
            min: 0,
            max: 365,
            presets: [],
          }),
        )
        return Message.PreparedDate({ generation, prepared })
      })
  },
})
const beginEdit = Root.makeStep((model, edit: Edit) => {
  const generation = model.generation + 1
  const value = edit.value
  const options = (edit.editor.options ?? []).map((option) => ({
    value: option.value,
    label: option.label ?? option.value,
  }))
  const selected = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
  const items = [
    ...options,
    ...selected
      .filter((entry) => !options.some((option) => option.value === entry))
      .map((entry) => ({ value: entry, label: entry })),
  ]

  const cleared = modifyFields(model, {
    active: () => Option.some(edit),
    generation: () => generation,
    input: () => Option.none(),
    select: () => Option.none(),
    tags: () => Option.none(),
    picker: () => Option.none(),
  })
  return Update.combineSteps([
    Root.makeStep(() => ({ model: cleared })),
    Root.makeStep((current) =>
      edit.editor.type === 'select'
        ? Select.init({
            args: [
              {
                id: `${model.id}-select`,
                items,
                defaultValue: typeof value === 'string' ? value : '',
              },
            ],
            toParentModel: (child) => modifyFields(current, { select: () => Option.some(child) }),
          })
        : edit.editor.type === 'tags'
          ? Tags.init({
              args: [
                {
                  id: `${model.id}-tags`,
                  items,
                  multiple: true,
                  defaultValue: Array.isArray(value) ? value : [],
                  allowCreate: edit.editor.creatable ?? false,
                },
              ],
              toParentModel: (child) => modifyFields(current, { tags: () => Option.some(child) }),
            })
          : edit.editor.type === 'date'
            ? { model: current, commands: [PrepareDate({ generation, id: model.id, value: edit })] }
            : Input.init({
                args: [{ id: `${model.id}-input`, value: value === null ? '' : String(value) }],
                toParentModel: (child) =>
                  modifyFields(current, { input: () => Option.some(child) }),
              }),
    ),
  ])
})
export const layer = Root.makeLayer({
  init: Composition.makeInit((id) => ({
    model: {
      id,
      active: Option.none(),
      generation: 0,
      input: Option.none(),
      select: Option.none(),
      tags: Option.none(),
      picker: Option.none(),
    },
  })),
  update: Composition.makeUpdate({
    PreparedDate: Root.makeStep((model, { generation, prepared }) =>
      generation !== model.generation || Option.getOrUndefined(model.active)?.editor.type !== 'date'
        ? { model }
        : Picker.init({
            args: [prepared],
            toParentModel: (child) => modifyFields(model, { picker: () => Option.some(child) }),
          }),
    ),
    ClickedApply: Root.makeStep((model) =>
      Option.isNone(model.active)
        ? { model }
        : Update.withOutMessage(
            { model },
            OutMessage.Committed({ value: model.active.value.value }),
          ),
    ),
    ClickedCancel: Root.makeStep((model) =>
      Update.withOutMessage({ model }, OutMessage.Cancelled()),
    ),
    KeyPressed: Root.makeStep((model, { key }) =>
      key === 'Escape' &&
      Option.isSome(model.active) &&
      ['text', 'link', 'number'].includes(model.active.value.editor.type)
        ? Update.withOutMessage(
            { model },
            OutMessage.Committed({ value: model.active.value.value }),
          )
        : key === 'Escape'
          ? Update.withOutMessage({ model }, OutMessage.Cancelled())
          : key === 'Enter' &&
              Option.isSome(model.active) &&
              !['select', 'tags', 'date'].includes(model.active.value.editor.type)
            ? Update.withOutMessage(
                { model },
                OutMessage.Committed({ value: model.active.value.value }),
              )
            : { model },
    ),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    RequestedEdit: beginEdit,
    RequestedClear: Root.makeFieldsStep(() => ({
      active: () => Option.none(),
      generation: (generation) => generation + 1,
      input: () => Option.none(),
      select: () => Option.none(),
      tags: () => Option.none(),
      picker: () => Option.none(),
    })),
  }),
  view: Composition.makeView.withInputs((model, inputs, h) => {
    const edit = Option.getOrNull(model.active)
    if (edit === null) return h.empty
    const appearance = resolvePresentation(inputs)
    const calendarInputs = {
      presentationContext: inputs.context ?? createPresentationContext(inputs),
      keyboardTrigger: true,
      fill: false,
      pill: appearance.shape.variant === 'pill',
      shape: appearance.shape,
      animate: inputs.animate,
      highlight: inputs.highlight,
      tooltip: ({
        content,
        render,
      }: Parameters<import('./date-picker.js').DatePickerViewInputs['tooltip']>[0]) =>
        render({
          button: (attributes, children) => h.button([...attributes, h.Title(content)], children),
        }),
      chevron: (
        attributes: ReadonlyArray<import('foldkit/html').ChildAttribute>,
        orientation: 'left' | 'right' | 'up' | 'down',
        size = 16,
      ) =>
        h.span(
          [
            ...attributes,
            h.Class(
              orientation === 'left'
                ? 'rotate-180'
                : orientation === 'up'
                  ? '-rotate-90'
                  : orientation === 'down'
                    ? 'rotate-90'
                    : '',
            ),
          ],
          [appearance.icons['chevron-right']({ size }, h)],
        ),
    }
    return h.div(
      [
        h.DataAttribute('grid-rich-editor', ''),
        h.Class('relative z-10 w-full min-w-40'),
        h.OnKeyDown((key) => Message.KeyPressed({ key })),
      ],
      [
        Option.isSome(model.input)
          ? h.block(
              Input.embedView({
                slotId: 'input',
                model: model.input.value,
                viewInputs: {
                  ...inputs,
                  type:
                    edit.editor.type === 'number'
                      ? 'number'
                      : edit.editor.type === 'link'
                        ? 'url'
                        : 'text',
                  placeholder: edit.editor.placeholder ?? '',
                  attributes: childAttributes([h.AriaLabel(inputs.ariaLabel ?? edit.columnId)]),
                },
              }),
            )
          : null,
        Option.isSome(model.select)
          ? h.block(
              Select.embedView({
                slotId: 'select',
                model: model.select.value,
                viewInputs: {
                  ...inputs,
                  ariaLabel: inputs.ariaLabel ?? edit.columnId,
                  placeholder: edit.editor.placeholder ?? 'Choose…',
                  variant: 'borderless',
                },
              }),
            )
          : null,
        Option.isSome(model.tags)
          ? h.block(
              Tags.embedView({
                slotId: 'tags',
                model: model.tags.value,
                viewInputs: {
                  ...inputs,
                  ariaLabel: inputs.ariaLabel ?? edit.columnId,
                  placeholder: edit.editor.placeholder ?? 'Add tags…',
                  variant: 'borderless',
                },
              }),
            )
          : null,
        Option.isSome(model.picker)
          ? h.block(
              Picker.embedView({
                slotId: 'picker',
                model: model.picker.value,
                viewInputs: calendarInputs,
              }),
            )
          : null,
        edit.editor.type === 'date' && Option.isNone(model.picker)
          ? h.span([h.Role('status')], ['Preparing calendar…'])
          : null,
        h.div(
          [h.Class('flex justify-end gap-1 pt-1')],
          [
            Button(
              {
                ...inputs,
                variant: 'ghost',
                buttonSize: 'compact',
                children: ['Cancel'],
                attributes: [h.OnClick(Message.ClickedCancel())],
              },
              h,
            ),
            Button(
              {
                ...inputs,
                variant: 'secondary',
                buttonSize: 'compact',
                children: ['Apply'],
                attributes: [h.OnClick(Message.ClickedApply())],
              },
              h,
            ),
          ],
        ),
      ],
    )
  }),
  EffectsLayer: PrepareDate.layer,
}).pipe(
  Layer.provide(Layer.mergeAll(InputLayer, SelectLayer, ComboboxLayer, PickerLayer)),
  Layer.provide(DefaultCalendarEnvironment),
)
