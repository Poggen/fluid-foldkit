import { filterSelectOptions } from './data-table-filter-options.js'
import { Option } from 'effect'
import { Update } from 'foldkit'
import {
  DataTableBlock,
  Table,
  HeaderMenu,
  RawActions,
  RawEditors,
  RawFilterSelects,
  RawViewTabs,
} from './data-table-definition.js'
import type { DataTableModel } from './data-table-definition.js'
import { dataTableRows, dataTableSelectedRows } from './data-table-state.js'
import type { dataTableUpdate } from './data-table-update.js'
function syncFilterSelects(model: DataTableModel) {
  const desired = filterSelectOptions(model)
  const added = desired.filter(({ key }) => !model.filterSelects.some((entry) => entry.key === key))
  const removed = model.filterSelects.some((entry) => !desired.some(({ key }) => key === entry.key))
  return Update.combineSteps([
    ...(added.length || removed
      ? [
          DataTableBlock.makeFieldsStep(() => ({
            filterSelects: (entries) => [
              ...entries.filter((entry) => desired.some(({ key }) => key === entry.key)),
              ...added.map(({ key, config }) => RawFilterSelects.create({ key, args: [config] })),
            ],
          })),
        ]
      : []),
    ...desired.flatMap(({ key, config }) => {
      const child = model.filterSelects.find((entry) => entry.key === key)?.model
      if (
        !child ||
        (child.value === config.value &&
          child.disabled === config.disabled &&
          child.items.length === config.items.length &&
          child.items.every(
            (item, i) =>
              item.value === config.items[i]?.value && item.label === config.items[i]?.label,
          ))
      )
        return []
      return [
        RawFilterSelects.requestConfigure(key, {
          items: config.items,
          value: config.value,
          disabled: config.disabled,
        }),
      ]
    }),
  ])
}
export const syncDataTableModel = (model: DataTableModel) =>
  DataTableBlock.makeStep((previous) => {
    const menu = Option.getOrNull(model.menu)
    const editing = Option.getOrNull(model.editing)
    const active = Option.getOrNull(model.editors.active)
    const viewIndex = Option.isSome(model.activeViewId)
      ? model.views.findIndex((view) => view.id === Option.getOrUndefined(model.activeViewId))
      : -1
    return Update.combineSteps([
      DataTableBlock.makeStep(() => ({ model })),
      ...(previous.columns !== model.columns ||
      previous.filters !== model.filters ||
      previous.disabled !== model.disabled
        ? [syncFilterSelects(model)]
        : []),
      ...(viewIndex >= 0 && viewIndex !== model.viewTabs.selectedIndex
        ? [RawViewTabs.requestSelected({ selectedIndex: viewIndex })]
        : []),
      HeaderMenu.requestControlledOpen({ control: Option.some(menu?.kind === 'column') }),
      RawActions.requestConfirmMove({ open: Option.isSome(model.pendingMove) }),
      RawActions.requestConfigure({
        selectedIds: dataTableSelectedRows(model).map((row) => row.id),
        disabled: model.disabled,
        selectable: model.selectable,
      }),
      ...(editing === null
        ? active === null
          ? []
          : [RawEditors.requestClear()]
        : active?.rowId === editing.rowId && active.columnId === editing.columnId
          ? []
          : model.columns.flatMap((column) =>
              column.id === editing.columnId && column.editor !== undefined
                ? [
                    RawEditors.requestEdit({
                      rowId: editing.rowId,
                      columnId: column.id,
                      editor: column.editor,
                      value: editing.draft,
                    }),
                  ]
                : [],
            )),
      Table.requestConfigure({
        selectedIndices: dataTableRows(model).flatMap(({ row }, index) =>
          model.selectedIds.includes(row.id) ? [index] : [],
        ),
        heldHeadIndex: null,
        hideHeadHighlight: false,
      }),
    ])
  })
export const applyDataTableResult = (result: ReturnType<typeof dataTableUpdate>) =>
  DataTableBlock.makeStep(() => {
    const steps = syncDataTableModel(result.model)
    return (registered: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(
        steps(registered),
        'outMessage' in result ? result.outMessage : undefined,
      )
  })
