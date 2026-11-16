import { Button } from '@foldkit/ui'
import type { SliderAskExampleBlock, SliderAskViewBuilder } from './slider-ask-example'

export const sliderAskToolbar = (
  messages: typeof SliderAskExampleBlock.Message,
  h: SliderAskViewBuilder,
) =>
  h.div(
    [h.Class('flex gap-2 mb-6 [&_button]:p-[4px_8px] [&_button]:[border:1px_solid_var(--border)]')],
    [
      Button.view(
        {
          onClick: messages.ClickedMount(),
          toView: (attributes) => h.button([...attributes.button, h.Id('set-mount')], ['Mount']),
        },
        h,
      ),
      ...(['sharp', 'rounded', 'pill'] as const).map((shape) =>
        Button.view(
          {
            onClick: messages.ClickedShape({ value: shape }),
            toView: (attributes) => h.button([...attributes.button], [shape]),
          },
          h,
        ),
      ),
      ...[
        {
          id: 'ClickedSize',
          label: 'Size',
          onClick: messages.ClickedSize(),
          attributes: [h.Id('set-size')],
        },
        {
          id: 'ClickedDisabled',
          label: 'Disabled',
          onClick: messages.ClickedDisabled(),
          attributes: [h.Id('set-disabled')],
        },
        {
          id: 'ClickedReject',
          label: 'Reject',
          onClick: messages.ClickedReject(),
          attributes: [h.Id('set-reject')],
        },
        {
          id: 'ClickedExternal',
          label: 'External',
          onClick: messages.ClickedExternal(),
          attributes: [h.Id('set-external')],
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
    ],
  )
