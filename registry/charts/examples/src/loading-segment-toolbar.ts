import { Button } from '@foldkit/ui'
import type {
  PublicLoadingSegmentConsumerBlock,
  LoadingSegmentViewBuilder,
} from './loading-segment-consumer'

export const loadingSegmentToolbar = (
  messages: typeof PublicLoadingSegmentConsumerBlock.Message,
  standalonePulse: boolean,
  pulseVisible: boolean,
  lineVisible: boolean,
  lifecycle: boolean,
  h: LoadingSegmentViewBuilder,
) =>
  h.nav(
    [],
    [
      Button.view(
        {
          onClick: messages.ClickedReplay(),
          toView: (attributes) =>
            h.button([...attributes.button, h.Id('public-loading-replay')], ['Replay first pulse']),
        },
        h,
      ),
      ...(standalonePulse
        ? [
            {
              id: 'ClickedPulseEnter',
              label: 'Enter first pulse',
              onClick: messages.ClickedPulseEnter(),
              attributes: [],
            },
            {
              id: 'ClickedPulseExit',
              label: 'Exit first pulse',
              onClick: messages.ClickedPulseExit(),
              attributes: [],
            },
            {
              id: 'ClickedPulseVisibility',
              label: pulseVisible ? 'Unmount first pulse' : 'Remount first pulse',
              onClick: messages.ClickedPulseVisibility(),
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
          )
        : [
            ...[
              {
                id: 'ClickedConcealed',
                label: 'Conceal preview',
                onClick: messages.ClickedConcealed(),
                attributes: [],
              },
              {
                id: 'ClickedPlaceholderReady',
                label: 'Placeholder ready',
                onClick: messages.ClickedPlaceholderReady(),
                attributes: [],
              },
              {
                id: 'ClickedPlaceholderLoading',
                label: 'Placeholder loading',
                onClick: messages.ClickedPlaceholderLoading(),
                attributes: [],
              },
              {
                id: 'ClickedFocusLast',
                label: 'Focus public line',
                onClick: messages.ClickedFocusLast(),
                attributes: [],
              },
              {
                id: 'ClickedClearFocus',
                label: 'Clear public line focus',
                onClick: messages.ClickedClearFocus(),
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
            ...(lifecycle
              ? [
                  Button.view(
                    {
                      onClick: messages.ClickedLineVisibility(),
                      toView: (attributes) =>
                        h.button(attributes.button, [
                          lineVisible ? 'Unmount context line' : 'Remount context line',
                        ]),
                    },
                    h,
                  ),
                ]
              : []),
            ...[
              {
                id: 'ClickedSweepLoop',
                label: 'Loop line sweep',
                onClick: messages.ClickedSweepLoop(),
                attributes: [],
              },
              {
                id: 'ClickedSweepEnter',
                label: 'Enter line sweep',
                onClick: messages.ClickedSweepEnter(),
                attributes: [],
              },
              {
                id: 'ClickedSweepExit',
                label: 'Exit line sweep',
                onClick: messages.ClickedSweepExit(),
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
          ]),
    ],
  )
