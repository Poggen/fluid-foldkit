import { localDate } from './calendar-domain/date-boundary.js'
import { formatDateLabel } from './date-picker-format.js'
import { resolvePresentation } from './presentation.js'
import { Option } from 'effect'
import { Editors } from './data-table-definition.js'
import { hoverHighlightAnimation } from './hover-highlight.js'
import type { MotionScope } from './motion.js'
import type { DataTableViewBuilder } from './data-table-definition.js'
// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
import type { Html } from 'foldkit/html'
import type {
  DataTableColumn,
  DataTableModel,
  DataTableRow,
  DataTableViewInputs,
} from './data-table-definition.js'
import { dataTableText } from './data-table-state.js'
import { Badge } from './badge.js'
import type { BadgeColor } from './badge.js'
import { badgeColors } from './badge.js'
const isBadgeColor = (value: string | undefined): value is BadgeColor =>
  value !== undefined && Object.hasOwn(badgeColors, value)

export function DataTableCellContent(
  model: DataTableModel,
  row: DataTableRow,
  column: DataTableColumn,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  motion: MotionScope,
): Html {
  const editingState = Option.getOrNull(model.editing)
  const editor = column.editor
  const editing =
    inputs.editable !== false &&
    model.editable &&
    editingState?.rowId === row.id &&
    editingState.columnId === column.id
  const value = editing ? editingState?.draft : row.values[column.id]
  const text = dataTableText(value)
  if (editing && editor)
    return h.block(
      Editors.embedView({
        slotId: `${model.id}-editor`,
        model: model.editors,
        viewInputs: {
          ...inputs,
          animate: motion.node,
          highlight: hoverHighlightAnimation(motion),
          ariaLabel: `${column.header} for ${row.id}`,
        },
      }),
    )
  const custom = inputs.renderCell?.({ row, column, value })
  if (custom !== undefined) return custom
  if (editor?.type === 'tags' && Array.isArray(value))
    return h.span(
      [h.Class('flex flex-wrap items-center gap-1')],
      value.map((tag) => Badge({ ...inputs, variant: 'ghost', children: [tag], color: 'gray' }, h)),
    )
  if (editor?.type === 'select') {
    const option = editor.options?.find((candidate) => candidate.value === text)
    const color = option?.color
    return Badge(
      {
        ...inputs,
        children: [option?.label ?? text],
        variant: 'ghost',
        ...(isBadgeColor(color) ? { color } : { color: 'gray' }),
      },
      h,
    )
  }
  const dayParts = editor?.type === 'date' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(text) : null
  if (dayParts && Number(dayParts[1]) && Number(dayParts[2]) && Number(dayParts[3])) {
    const date = localDate(Number(dayParts[1]), Number(dayParts[2]) - 1, Number(dayParts[3]))
    if (!Number.isNaN(date.getTime()))
      return h.span(
        [h.Class('flex items-center gap-1.5')],
        [resolvePresentation(inputs).icons.calendar({ size: 14 }, h), formatDateLabel(date)],
      )
  }
  if (editor?.type === 'link') {
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`
    const safe = /^(https?:|mailto:|tel:)/i.test(candidate)
    return safe && text
      ? h.a(
          [
            h.Href(candidate),
            h.Target('_blank'),
            h.Rel('noopener noreferrer'),
            h.Class(
              'block truncate text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground',
            ),
            h.Tabindex(-1),
          ],
          [text],
        )
      : h.span([], [text])
  }
  const lines = model.columnLines[column.id] ?? inputs.lines ?? column.lines ?? 1
  return h.span(
    [
      h.Class(
        lines === 'wrap'
          ? 'block whitespace-normal break-words'
          : lines === 2
            ? 'line-clamp-2 whitespace-normal break-words'
            : 'block overflow-hidden text-ellipsis whitespace-nowrap',
      ),
    ],
    [text || h.span([h.Class('text-muted-foreground/50')], ['—'])],
  )
}
