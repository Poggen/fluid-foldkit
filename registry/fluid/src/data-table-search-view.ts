/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import { Input } from '@foldkit/ui'
import type { Html } from 'foldkit/html'
import { Message } from './data-table-definition.js'
import type {
  DataTableModel,
  DataTableViewInputs,
  DataTableViewBuilder,
} from './data-table-definition.js'
import type { MotionScope } from './motion.js'
import { Button } from './button.js'
import { formControlDefault, formControlClasses } from './form-control-dom.js'
import { resolvePresentation } from './presentation.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'

export const DataTableSearchField: (
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  motion: MotionScope,
) => Html = function DataTableSearchField(
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  motion: MotionScope,
) {
  const { icons, shape, size, reducedMotion } = resolvePresentation(inputs)
  const compact = size.variant === 'compact'
  const value = typeof model.search === 'string' ? model.search : model.search.query
  const expanded = inputs.searchCollapsible === false || model.searchOpen || value !== ''
  const placeholder = inputs.searchPlaceholder ?? 'Search…'
  const label = placeholder.replace(/…$/, '')
  return motion.node(
    h.span(
      [
        h.DataAttribute('slot', 'data-table-search'),
        h.Class('relative block min-w-0 shrink'),
        h.Style({ maxWidth: '100%' }),
      ],
      [
        icons.search(
          {
            size: size.icon,
            strokeWidth: 1.5,
            className: `pointer-events-none absolute top-1/2 z-[1] -translate-y-1/2 text-muted-foreground ${compact ? 'left-[7px]' : 'left-2.5'}`,
          },
          h,
        ),
        !expanded
          ? Button(
              {
                ...inputs,
                variant: 'ghost',
                buttonSize: compact ? 'icon-compact' : 'icon',
                children: [],
                className: 'absolute inset-0',
                attributes: [
                  h.AriaLabel(label),
                  h.AriaExpanded(false),
                  h.DataAttribute('grid-search-button', ''),
                  h.OnClick(Message.SearchOpened()),
                ],
              },
              h,
            )
          : null,
        Input.view(
          {
            id: `${model.id}-search`,
            type: 'search',
            value,
            isDisabled: model.disabled,
            onInput: (query) =>
              Message.SearchChanged({
                search: inputs.searchColumn ? { column: inputs.searchColumn, query } : query,
              }),
            toView: (attributes) =>
              formControlDefault(
                h.input([
                  ...attributes.input,
                  h.Placeholder(placeholder),
                  h.AriaLabel(label),
                  h.Tabindex(expanded ? 0 : -1),
                  h.AriaHidden(!expanded),
                  h.DataAttribute('grid-search-input', ''),
                  h.DataAttribute(
                    'grid-search-collapsible',
                    String(inputs.searchCollapsible !== false),
                  ),
                  h.OnBlur(Message.SearchBlurred()),
                  h.Class(
                    cn(
                      formControlClasses,
                      shape.input,
                      size.control,
                      size.field,
                      size.px,
                      compact ? 'pl-[28px]' : 'pl-9',
                      'border-transparent focus:border-transparent aria-invalid:focus:border-transparent hover:bg-hover focus:bg-hover focus:hover:bg-hover',
                      !expanded && 'pointer-events-none opacity-0',
                    ),
                  ),
                ]),
                value,
              ),
          },
          h,
        ),
      ],
    ),
    {
      initial: false,
      animate: { width: expanded ? (inputs.searchWidth ?? 224) : size.controlHeight },
      transition: reducedMotion === 'always' ? { duration: 0 } : spring.moderate,
      reducedMotion,
    },
  )
}
