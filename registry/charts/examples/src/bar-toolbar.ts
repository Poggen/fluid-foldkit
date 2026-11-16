import { Button } from '@foldkit/ui'
import type { BarFixtureBlock, BarFixtureViewBuilder } from './bar-entry'

export const barToolbar = (
  messages: typeof BarFixtureBlock.Message,
  hasSquares: boolean,
  h: BarFixtureViewBuilder,
) =>
  h.nav(
    [],
    [
      ...[
        {
          id: 'ClickedChangeOptions',
          label: 'Change options',
          onClick: messages.ClickedChangeOptions(),
          attributes: [],
        },
        {
          id: 'ClickedFocus',
          label: 'Focus last',
          onClick: messages.ClickedFocus(),
          attributes: [],
        },
        {
          id: 'ClickedClearFocus',
          label: 'Clear focus',
          onClick: messages.ClickedClearFocus(),
          attributes: [],
        },
        {
          id: 'ClickedReplay',
          label: 'Replay',
          onClick: messages.ClickedReplay(),
          attributes: [],
        },
        {
          id: 'ClickedEmpty',
          label: 'Empty',
          onClick: messages.ClickedEmpty(),
          attributes: [],
        },
        {
          id: 'ClickedRestore',
          label: 'Restore',
          onClick: messages.ClickedRestore(),
          attributes: [],
        },
        {
          id: 'ClickedMissingCosts',
          label: 'Show missing costs',
          onClick: messages.ClickedMissingCosts(),
          attributes: [],
        },
        {
          id: 'ClickedUnmount',
          label: 'Unmount',
          onClick: messages.ClickedUnmount(),
          attributes: [],
        },
        {
          id: 'ClickedRemount',
          label: 'Remount',
          onClick: messages.ClickedRemount(),
          attributes: [],
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
      ...(!hasSquares
        ? []
        : [
            Button.view(
              {
                onClick: messages.ClickedToggleGradient(),
                toView: (attributes) => h.button([...attributes.button], ['Toggle gradient']),
              },
              h,
            ),
            Button.view(
              {
                onClick: messages.ClickedResize(),
                toView: (attributes) => h.button([...attributes.button], ['Resize']),
              },
              h,
            ),
          ]),
    ],
  )
