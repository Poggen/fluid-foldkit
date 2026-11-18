import type { ChildAttribute, Html } from 'foldkit/html'
import { Option } from 'effect'
import {
  Message,
  DataTableActionsComposition as Composition,
  DataTableActionsContext as Context,
  DataTableActionsPalette as Palette,
  DataTableActionsObserveTargets as ObserveTargets,
  DataTableActionsConfirmation as Confirmation,
} from './data-table-actions.js'
import { DropdownItem } from './dropdown-item.js'
import { DialogTitle, DialogDescription, DialogFooter } from './dialog.js'
import { Button } from './button.js'
import { Elevated } from './elevated.js'
import { CommandMenuShortcut } from './command-menu.js'
import type { MotionScope } from './motion.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { spring } from './lib/springs.js'

export interface DataTableActionsViewInputs extends Presentation {
  readonly content: (attributes: ReadonlyArray<ChildAttribute>) => Html
  readonly showSelectionBar?: boolean
}
export function makeDataTableActionsView(motion: MotionScope) {
  return Composition.makeView.withInputs<DataTableActionsViewInputs>((model, inputs, h) => {
    const { icons, shape, size, reducedMotion } = resolvePresentation(inputs)
    const animate: typeof motion.node = (node, options) =>
      motion.node(node, { ...options, reducedMotion })
    const selected = model.selectedIds.length
    const noun = selected === 1 ? 'row' : 'rows'
    const hasActions = model.selectionActions.length > 0
    return h.div(
      [h.Id(model.id), h.Class('contents'), h.OnMount(ObserveTargets())],
      [
        model.rowActions.length === 0
          ? inputs.content([])
          : h.block(
              Context.embedView({
                slotId: `${model.id}-context`,
                model: model.context,
                viewInputs: {
                  ...inputs,
                  className: 'contents',
                  contentClassName: 'w-56',
                  filter: '[data-grid-body-row], [data-grid-body-row] *',
                  clickTarget: '[data-grid-row-action]',
                  trigger: (attributes) => inputs.content(attributes),
                  content: (context) =>
                    model.rowActions.map((action, index) =>
                      DropdownItem(
                        {
                          index,
                          label:
                            action.value === 'select' &&
                            Option.isSome(model.targetId) &&
                            model.selectedIds.includes(model.targetId.value)
                              ? 'Deselect row'
                              : action.label,
                          disabled:
                            model.disabled ||
                            action.disabled === true ||
                            (action.value === 'select' && !model.selectable),
                          className: action.destructive === true ? 'text-destructive' : '',
                          animate,
                        },
                        context,
                        h,
                      ),
                    ),
                  animate,
                },
              }),
            ),
        inputs.showSelectionBar === false || model.shownCount === 0
          ? null
          : motion.node(
              h.div(
                [
                  h.Class('pointer-events-none sticky bottom-5 z-30 -mt-12 flex justify-center'),
                  h.DataAttribute('grid-selection-bar', ''),
                ],
                [
                  Elevated(
                    {
                      context: createPresentationContext(inputs),
                      offset: 2,
                      shadowLevel: 3,
                      className: `pointer-events-auto flex w-fit items-center gap-1 whitespace-nowrap p-1 pl-5 ${shape.container} [--bar-bg:var(--foreground)] [--bar-fg:var(--background)] bg-(--bar-bg)! text-(--bar-fg)`,
                      attributes: [h.Role('toolbar'), h.AriaLabel('Selected rows')],
                      children: () => [
                        h.div(
                          [
                            h.Class(
                              'contents [--foreground:var(--bar-fg)] [--background:var(--bar-bg)] [--muted-foreground:color-mix(in_oklab,var(--bar-fg)_65%,transparent)] [--hover:color-mix(in_oklab,var(--bar-fg)_12%,transparent)] [--active:color-mix(in_oklab,var(--bar-fg)_20%,transparent)]',
                            ),
                          ],
                          [
                            h.span(
                              [h.AriaLive('polite'), h.Class('mr-1 tabular-nums text-foreground')],
                              [`${model.shownCount} selected`],
                            ),
                            hasActions
                              ? Button(
                                  {
                                    ...inputs,
                                    variant: 'ghost',
                                    buttonSize: size.variant === 'compact' ? 'compact' : 'default',
                                    children: [
                                      'Actions',
                                      CommandMenuShortcut(
                                        {
                                          keys: 'mod+k',
                                          mac: model.palette.menu.mac,
                                          className: 'ml-1',
                                        },
                                        h,
                                      ),
                                    ],
                                    attributes: [
                                      h.AriaKeyshortcuts('Meta+K Control+K'),
                                      h.OnClick(Message.OpenedPalette()),
                                    ],
                                  },
                                  h,
                                )
                              : null,
                            Button(
                              {
                                ...inputs,
                                variant: 'ghost',
                                buttonSize: size.variant === 'compact' ? 'icon-compact' : 'icon',
                                leadingIcon: icons.x,
                                children: [],
                                attributes: [
                                  h.AriaLabel('Clear selection'),
                                  h.AriaKeyshortcuts('Escape'),
                                  h.DataAttribute('grid-clear-selection', ''),
                                  h.OnClick(Message.SelectionCleared()),
                                ],
                              },
                              h,
                            ),
                          ],
                        ),
                      ],
                    },
                    h,
                  ),
                ],
              ),
              {
                present: selected > 0,
                initial:
                  reducedMotion === 'always' ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 },
                animate: { opacity: 1, y: 0, scale: 1 },
                exit:
                  reducedMotion === 'always' ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 },
                transition: spring.moderate,
              },
            ),
        inputs.showSelectionBar === false
          ? null
          : h.block(
              Palette.embedView({
                slotId: `${model.id}-palette`,
                model: model.palette,
                viewInputs: {
                  ...inputs,
                  animate,
                  title: 'Selection actions',
                  description: `Actions for ${selected} selected ${noun}.`,
                  placeholder: `Act on ${selected} ${noun}…`,
                  emptyText: 'No action matches.',
                  renderItemLabel: (item) => [
                    h.span(
                      [
                        h.Class(
                          model.selectionActions.find((action) => action.value === item.value)
                            ?.destructive === true
                            ? 'text-destructive'
                            : '',
                        ),
                      ],
                      [item.label],
                    ),
                  ],
                },
              }),
            ),
        h.block(
          Confirmation.embedView({
            slotId: `${model.id}-confirm-move`,
            model: model.confirmation,
            viewInputs: {
              ...inputs,
              size: 'sm',
              hasDescription: true,
              animate,
              content: (context) => [
                DialogTitle({ dialogId: context.id, children: ['Remove sorting?'] }, h),
                DialogDescription(
                  {
                    dialogId: context.id,
                    children: ["Rows can only be moved while the table isn't sorted."],
                  },
                  h,
                ),
                DialogFooter(
                  {
                    children: [
                      Button(
                        {
                          ...inputs,
                          variant: 'ghost',
                          children: ['Cancel'],
                          attributes: [h.OnClick(Message.MoveCancelled())],
                        },
                        h,
                      ),
                      Button(
                        {
                          ...inputs,
                          children: ['Remove sorting'],
                          attributes: [h.OnClick(Message.MoveConfirmed())],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ],
            },
          }),
        ),
      ],
    )
  })
}
