import { Option } from 'effect'
import { Button } from './button.js'
import {
  Message,
  ViewTabs,
  type DataTableModel,
  type DataTableViewBuilder,
  type DataTableViewInputs,
} from './data-table-definition.js'
import { TabsItem } from './tabs-parts.js'
import type { MotionScope } from './motion.js'

export function DataTableSavedViews(
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  motion: MotionScope,
) {
  if (inputs.savedViews === false || (!model.views.length && inputs.savedViews !== true))
    return h.empty
  const selected = model.views.find((view) => Option.contains(model.activeViewId, view.id))
  const name = model.viewName.trim()
  let index = model.views.length + 1
  while (model.views.some((view) => view.id === 'view-' + index)) index++
  return h.div(
    [h.Class('flex flex-wrap items-center gap-1')],
    [
      model.views.length
        ? h.block(
            ViewTabs.embedView({
              slotId: 'saved-views',
              model: model.viewTabs,
              viewInputs: {
                ...inputs,
                ariaLabel: 'Saved views',
                animate: motion.node,
                items: model.views.map((view) => ({ value: view.id, disabled: model.disabled })),
                content: (context) =>
                  model.views.map((view, index) =>
                    TabsItem({ index, label: view.name }, context, h),
                  ),
              },
            }),
          )
        : null,
      h.details(
        [h.Class('min-w-0 text-caption')],
        [
          h.summary([h.Class('cursor-pointer text-muted-foreground')], ['Manage views']),
          h.div(
            [h.Class('flex flex-wrap items-center gap-1 py-1')],
            [
              h.input([
                h.AriaLabel('View name'),
                h.Disabled(model.disabled),
                h.Placeholder('View name'),
                h.Value(model.viewName),
                h.Class('min-w-16 max-w-32 bg-hover px-2 py-1'),
                h.OnInput((name) => Message.ViewNameChanged({ name })),
              ]),
              Button(
                {
                  ...inputs,
                  variant: 'ghost',
                  buttonSize: 'compact',
                  disabled: model.disabled || !name,
                  children: ['Save new view'],
                  attributes: [h.OnClick(Message.ViewSaved({ id: 'view-' + index, name }))],
                },
                h,
              ),
              ...(selected && selected !== model.views[0]
                ? [
                    Button(
                      {
                        ...inputs,
                        variant: 'ghost',
                        buttonSize: 'compact',
                        disabled: model.disabled || !name,
                        children: ['Rename view'],
                        attributes: [h.OnClick(Message.ViewRenamed({ id: selected.id, name }))],
                      },
                      h,
                    ),
                    Button(
                      {
                        ...inputs,
                        variant: 'ghost',
                        buttonSize: 'compact',
                        disabled: model.disabled,
                        children: ['Delete view'],
                        attributes: [h.OnClick(Message.ViewDeleted({ id: selected.id }))],
                      },
                      h,
                    ),
                  ]
                : []),
            ],
          ),
        ],
      ),
    ],
  )
}
