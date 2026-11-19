import { Option } from 'effect'
import { childAttributes } from 'foldkit/html'
/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import { Composition, ObserveDataTable } from './data-table-composition.js'
import { Table, Actions } from './data-table-definition.js'
import type { DataTableViewInputs } from './data-table-definition.js'
import type { MotionScope } from './motion.js'
import { hoverHighlightAnimation } from './hover-highlight.js'
import { DataTableToolbar, DataTablePagination } from './data-table-toolbar.js'
import { DataTableFilterChips } from './data-table-filters-view.js'
import { renderDataTable } from './data-table-render.js'
import { dataTableRows } from './data-table-state.js'
import { resolvePresentation } from './presentation.js'

export const makeDataTableView = (motion: MotionScope) => {
  const animateHighlight = hoverHighlightAnimation(motion)
  return Composition.makeView.withInputs<DataTableViewInputs>((model, inputs, h) => {
    const menu = Option.getOrNull(model.menu)
    const { size } = resolvePresentation(inputs)
    const rows = dataTableRows(model)
    return motion.root(
      h.div(
        [
          h.Id(model.id),
          h.Class(`relative flex min-w-0 flex-col gap-3 ${inputs.className ?? ''}`),
          h.DataAttribute('fluid-data-table', ''),
          h.DataAttribute('grid-header-menu', menu?.kind === 'column' ? menu.id : ''),
          h.DataAttribute('grid-columns', JSON.stringify(model.columnOrder)),
          h.DataAttribute('grid-selected', JSON.stringify(model.selectedIds)),
          h.AriaBusy(inputs.loading ?? false),
          h.AriaDisabled(model.disabled),
          h.OnMount(ObserveDataTable()),
        ],
        [
          inputs.title
            ? h.div(
                [h.Class('px-2')],
                [
                  h.h2([h.Class('text-lg font-medium text-foreground')], [inputs.title]),
                  inputs.description
                    ? h.p([h.Class('mt-1 text-sm text-muted-foreground')], [inputs.description])
                    : null,
                ],
              )
            : null,
          inputs.showToolbar === false ? null : DataTableToolbar(model, inputs, h, motion),
          inputs.renderScope?.() ?? null,
          inputs.showFilters === false ? null : DataTableFilterChips(model, h, inputs, motion),
          h.div(
            [
              h.Class(
                [
                  '@container relative min-w-0 overflow-x-auto [--table-view-w:100cqi]',
                  '[--table-edge:color-mix(in_srgb,var(--foreground)_18%,transparent)]',
                  '[background-image:linear-gradient(to_right,var(--background)_50%,transparent),linear-gradient(to_left,var(--background)_50%,transparent),linear-gradient(to_right,var(--table-edge),transparent),linear-gradient(to_left,var(--table-edge),transparent)]',
                  '[background-position:left,right,left,right] [background-size:1.5rem_100%,1.5rem_100%,0.65rem_100%,0.65rem_100%]',
                  'bg-no-repeat [background-attachment:local,local,scroll,scroll]',
                ].join(' '),
              ),
              h.DataAttribute('grid-scroll', ''),
            ],
            [
              h.block(
                Actions.embedView({
                  slotId: `${model.id}-actions`,
                  model: model.actions,
                  viewInputs: {
                    ...inputs,
                    content: (attributes) =>
                      h.div(attributes, [
                        h.block(
                          Table.embedView({
                            slotId: model.table.id,
                            model: model.table,
                            viewInputs: {
                              animateHighlight,
                              size: size.variant,
                              ...(inputs.context === undefined ? {} : { context: inputs.context }),
                              className:
                                inputs.resizableColumns === false ? 'table-auto' : 'table-fixed',
                              attributes: childAttributes([
                                h.AriaLabel(inputs.label ?? inputs.title ?? 'Data table'),
                              ]),
                              content: (context) =>
                                renderDataTable(model, inputs, h, context, motion),
                            },
                          }),
                        ),
                      ]),
                  },
                }),
              ),
            ],
          ),
          inputs.showPagination === false || inputs.empty === true
            ? null
            : DataTablePagination(model, inputs, h),
          ...model.columns
            .filter((column) => (column.editor?.options?.length ?? 0) > 0)
            .map((column) =>
              h.datalist(
                [h.Id(`${model.id}-${column.id}-options`)],
                (column.editor?.options ?? []).map((option) =>
                  h.option([h.Value(option.value)], [option.label ?? option.value]),
                ),
              ),
            ),
        ],
      ),
      JSON.stringify([
        rows.map(({ row }) => row.id),
        model.columnOrder,
        model.hiddenColumns,
        model.columnWidths,
        model.columnLines,
        model.selectedIds,
        model.editing,
        inputs.lines,
        inputs.loading,
        inputs.empty,
        inputs.cellAlignment,
      ]),
    )
  })
}
