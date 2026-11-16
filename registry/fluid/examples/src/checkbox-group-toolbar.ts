import { Button } from '@foldkit/ui'
import type {
  SelectionFormsExampleBlock,
  SelectionFormsViewBuilder,
} from './checkbox-group-example'

export const checkboxGroupToolbar = (
  messages: typeof SelectionFormsExampleBlock.Message,
  h: SelectionFormsViewBuilder,
) =>
  h.div(
    [h.Class('flex gap-2 mb-4 [&_button]:p-[4px_8px] [&_button]:[border:1px_solid_var(--border)]')],
    [
      {
        id: 'ClickedSize',
        label: 'Size',
        onClick: messages.ClickedSize(),
        attributes: [h.Id('set-size')],
      },
      {
        id: 'ClickedShape',
        label: 'Shape',
        onClick: messages.ClickedShape(),
        attributes: [h.Id('set-shape')],
      },
      {
        id: 'ClickedMount',
        label: 'Mount',
        onClick: messages.ClickedMount(),
        attributes: [h.Id('set-mount')],
      },
      {
        id: 'ClickedErrors',
        label: 'Errors',
        onClick: messages.ClickedErrors(),
        attributes: [h.Id('set-errors')],
      },
      {
        id: 'ClickedDisabled',
        label: 'Disabled',
        onClick: messages.ClickedDisabled(),
        attributes: [h.Id('set-disabled')],
      },
      {
        id: 'ClickedExternal',
        label: 'External',
        onClick: messages.ClickedExternal(),
        attributes: [h.Id('set-external')],
      },
      {
        id: 'ClickedReject',
        label: 'Reject edits',
        onClick: messages.ClickedReject(),
        attributes: [h.Id('set-reject')],
      },
    ].map(({ id, label, onClick, attributes: controlAttributes }) =>
      Button.view(
        {
          onClick,
          toView: (attributes) =>
            h.button([...attributes.button, h.Key(id), ...controlAttributes], [label]),
        },
        h,
      ),
    ),
  )
