import { DataTableWrapText } from './data-table-wrap-view.js'
import { DropdownLabel, DropdownSeparator } from './dropdown-parts.js'
// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
import { childAttributes } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import { ViewMenu, Message } from './data-table-definition.js'
import type {
  DataTableModel,
  DataTableViewInputs,
  DataTableViewBuilder,
} from './data-table-definition.js'
import { DropdownItem } from './dropdown-item.js'
import { Button } from './button.js'
import { resolvePresentation } from './presentation.js'
import type { MotionScope } from './motion.js'

export function DataTableColumnsMenu(
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  motion: MotionScope,
): Html {
  const { icons, size } = resolvePresentation(inputs)
  const ids = [
    ...model.pinnedColumns.left,
    ...model.columnOrder.filter(
      (id) => !model.pinnedColumns.left.includes(id) && !model.pinnedColumns.right.includes(id),
    ),
    ...model.pinnedColumns.right,
  ]
  const columns = [
    ...ids.flatMap((id) => model.columns.filter((column) => column.id === id)),
    ...model.columns.filter((column) => !ids.includes(column.id)),
  ]

  return h.block(
    ViewMenu.embedView({
      slotId: `${model.id}-view-menu`,
      model: model.viewMenu,
      viewInputs: {
        ...inputs,
        animate: motion.node,
        align: 'end',
        trigger: (attributes) =>
          Button(
            {
              ...inputs,
              variant: 'ghost',
              buttonSize: size.variant === 'compact' ? 'icon-compact' : 'icon',
              leadingIcon: icons['sliders-horizontal'],
              children: [],
              attributes: [...attributes, ...childAttributes([h.AriaLabel('Columns')])],
            },
            h,
          ),
        content: (context) => [
          ...(model.columns.some((column) => column.lines !== undefined)
            ? [DataTableWrapText(model, inputs, h, motion), DropdownSeparator({ children: [] }, h)]
            : []),
          DropdownLabel({ ...inputs, children: ['Columns'] }, h),
          ...columns
            .filter((column) => column.hideable !== false)
            .map((column, index) =>
              DropdownItem(
                {
                  index,
                  id: `${model.id}-columns-${column.id}`,
                  label: column.header,
                  checked: !model.hiddenColumns.includes(column.id),
                  closeOnClick: false,
                  className: 'touch-none',
                  animate: motion.node,
                  attributes: childAttributes([
                    h.DataAttribute('grid-column-menu-row', column.id),
                    h.DataAttribute('grid-column', column.id),
                    ...(inputs.reorderColumns === false
                      ? []
                      : [h.DataAttribute('grid-drag', 'column-menu')]),
                    h.OnClick(
                      Message.ColumnVisibilityChanged({
                        id: column.id,
                        visible: model.hiddenColumns.includes(column.id),
                      }),
                    ),
                  ]),
                },
                { ...context, multiple: true },
                h,
              ),
            ),
        ],
      },
    }),
  )
}
