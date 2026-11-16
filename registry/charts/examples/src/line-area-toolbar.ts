import { Button } from '@foldkit/ui'
import type { LineAreaFixtureBlock, LineAreaFixtureViewBuilder } from './line-area-entry'

export const lineAreaToolbar = (
  messages: typeof LineAreaFixtureBlock.Message,
  mounted: boolean,
  lifecycle: boolean,
  h: LineAreaFixtureViewBuilder,
) =>
  h.nav(
    [
      h.Class(
        '[nav&_button]:[border:0] [nav&_button]:[border-radius:0] [nav&_button]:bg-transparent [nav&_button]:[line-height:24px]',
      ),
    ],
    [
      ...[
        {
          id: 'ClickedLoading',
          label: 'Loading',
          onClick: messages.ClickedLoading(),
          attributes: [],
        },
        {
          id: 'ClickedReset',
          label: 'Ready',
          onClick: messages.ClickedReset(),
          attributes: [],
        },
        {
          id: 'ClickedShrink',
          label: 'Shrink',
          onClick: messages.ClickedShrink(),
          attributes: [],
        },
        {
          id: 'ClickedReplay',
          label: 'Replay',
          onClick: messages.ClickedReplay(),
          attributes: [],
        },
        {
          id: 'ClickedFocus',
          label: 'Focus fifth',
          onClick: messages.ClickedFocus(),
          attributes: [],
        },
        {
          id: 'ClickedRestore',
          label: 'Reset data',
          onClick: messages.ClickedRestore(),
          attributes: [],
        },
        {
          id: 'ClickedClear',
          label: 'Clear focus',
          onClick: messages.ClickedClear(),
          attributes: [],
        },
        {
          id: 'ClickedZoomed',
          label: 'Zoom middle',
          onClick: messages.ClickedZoomed(),
          attributes: [],
        },
        {
          id: 'ClickedUnzoomed',
          label: 'Full range',
          onClick: messages.ClickedUnzoomed(),
          attributes: [],
        },
        {
          id: 'ClickedChangeInputs',
          label: 'Change inputs',
          onClick: messages.ClickedChangeInputs(),
          attributes: [],
        },
        {
          id: 'ClickedChangeSweep',
          label: 'Sweep style',
          onClick: messages.ClickedChangeSweep(),
          attributes: [],
        },
        {
          id: 'ClickedValues',
          label: 'Values',
          onClick: messages.ClickedValues(),
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
      lifecycle
        ? Button.view(
            {
              onClick: messages.ClickedToggleMount(),
              toView: (attributes) =>
                h.button([...attributes.button], [mounted ? 'Unmount primary' : 'Remount primary']),
            },
            h,
          )
        : h.empty,
    ],
  )
