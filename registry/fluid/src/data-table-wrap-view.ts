/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import { Switch } from '@foldkit/ui'
import type { Html } from 'foldkit/html'
import { Message } from './data-table-definition.js'
import type {
  DataTableModel,
  DataTableViewInputs,
  DataTableViewBuilder,
} from './data-table-definition.js'
import type { MotionScope } from './motion.js'
import { resolvePresentation } from './presentation.js'
import { switchMetrics } from './switch.js'
import { spring } from './lib/springs.js'

export const DataTableWrapText: (
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  motion: MotionScope,
) => Html = function DataTableWrapText(
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  motion: MotionScope,
) {
  const columns = model.columns.filter((column) => column.lines !== undefined)
  if (columns.length === 0) return null
  const { shape, size, reducedMotion } = resolvePresentation(inputs)
  const wrapped = columns.every(
    (column) => (model.columnLines[column.id] ?? inputs.lines ?? column.lines) === 'wrap',
  )
  const metrics = switchMetrics[size.variant]
  const round = shape.variant === 'sharp' ? 'rounded-[1px]' : 'rounded-full'
  return Switch.view(
    {
      id: `${model.id}-wrap-text`,
      isChecked: wrapped,
      isDisabled: model.disabled,
      onToggle: (checked) => Message.TextWrapChanged({ wrapped: checked }),
      toView: (attributes) =>
        h.div(
          [h.Class('flex min-h-9 items-center justify-between gap-3 px-2')],
          [
            h.span(
              [...attributes.label, h.Class('cursor-pointer text-sm text-foreground')],
              ['Wrap text'],
            ),
            h.button(
              [
                ...attributes.button,
                h.Class(
                  `relative shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${round}`,
                ),
                h.Style({
                  width: `${metrics.trackWidth}px`,
                  height: `${metrics.trackHeight}px`,
                  background: wrapped ? 'var(--foreground)' : 'var(--accent)',
                }),
              ],
              [
                motion.node(
                  h.keyed('span')('wrap-thumb', [
                    h.Class(`absolute left-0 top-0 block bg-white shadow-sm ${round}`),
                  ]),
                  {
                    initial: false,
                    animate: {
                      x: wrapped ? metrics.trackWidth - metrics.thumbSize - 2 : 2,
                      y: 2,
                      width: metrics.thumbSize,
                      height: metrics.thumbSize,
                    },
                    transition: spring.fast,
                    reducedMotion,
                  },
                ),
              ],
            ),
          ],
        ),
    },
    h,
  )
}
