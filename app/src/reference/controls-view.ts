import { KeyCap } from '@foldkit-visuals/fluid/key-cap'
import { switchMotion } from '../gallery/fluid/core-bindings'
import { previewToolbar } from './classes'
import { Button } from '@foldkit-visuals/fluid/button'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { childAttributes } from 'foldkit/html'
import { previewCodeTabsViewInputs } from '../../../components/docs/preview-code-tabs'
import { pageAt } from '../../../lib/catalogue'
import { presentation, type ResolvedSettings as Settings } from '../settings'
import { highlight, target } from '../motion'
import { Controls } from './control-bindings'
import { ControlsHighlight, ControlsHover, ShuffleTooltip, PlaygroundTabs } from './chrome-bindings'
import { ComponentReferenceBlock, Message } from './block'
import { ShuffleShortcut } from './commands'
import { shuffleIcon } from './shuffle-icon'
import { Inspector, type H } from './view'
type Model = typeof ComponentReferenceBlock.Model.Type
export const controlsView = (
  path: Model['path'],
  controls: Model['controls'],
  controlsHover: Model['controlsHover'],
  controlsHighlight: Model['controlsHighlight'],
  shuffleTooltip: Model['shuffleTooltip'],
  ready: boolean,
  shape: Settings['shape'],
  size: Settings['size'],
  hover: Settings['hover'],
  h: H,
) => {
  const settings = { shape, size, hover }
  const page = pageAt(path)
  if (page === undefined) return h.empty
  const context = presentation(settings)
  return h.aside(
    [
      h.Class('playground-controls w-full pt-8'),
      h.AriaLabel(`${page.name} props`),
      h.DataAttribute('playground-controls-path', path),
      h.OnMount(ShuffleShortcut()),
    ],
    [
      h.div(
        [
          h.Class('flex h-8 items-center justify-between pl-2'),
          ...(ready ? [] : [h.Attribute('inert', '')]),
        ],
        [
          h.h3([h.Class(`text-site-caption text-foreground`)], ['Playground variant']),
          Button(
            {
              context,
              variant: 'ghost',
              buttonSize: 'toolbar',
              attributes: [h.OnClick(Message.RequestedReset())],
              children: ['Reset'],
            },
            h,
          ),
          h.block(
            ShuffleTooltip.embedView({
              slotId: 'docs-playground-shuffle-tooltip',
              model: shuffleTooltip,
              viewInputs: {
                renderDocument: (content, popups) =>
                  h.div([h.Class('contents')], [content, ...popups]),
                renderTrigger: (_key, { button }) =>
                  Button(
                    {
                      context,
                      variant: 'ghost',
                      buttonSize: 'toolbar',
                      attributes: [h.OnClick(Message.RequestedShuffle()), h.AriaLabel('Shuffle')],
                      trailingIcon: (_options, iconHtml) => shuffleIcon(iconHtml),
                      children: [
                        KeyCap(
                          {
                            children: 'X',
                            className: 'pointer-coarse:hidden',
                            attributes: [h.AriaHidden(true)],
                          },
                          h,
                        ),
                      ],
                      render: (attributes, children) =>
                        button(
                          attributes.flatMap((attribute) =>
                            '__childAttribute' in attribute
                              ? [attribute]
                              : childAttributes([attribute]),
                          ),
                          children,
                        ),
                    },
                    h,
                  ),
                render: ({ tooltip }) =>
                  tooltip('docs-playground-shuffle', {
                    content: 'Shuffle',
                    shapeClass: settings.shape === 'sharp' ? 'rounded-none' : 'rounded-lg',
                    animate: target.node,
                    reducedMotion: 'user',
                  }),
              },
            }),
          ),
        ],
      ),
      h.block(
        ControlsHover.embedView({
          slotId: controlsHover.id,
          model: controlsHover,
          viewInputs: {
            className: 'relative flex flex-col [&_.play-row:hover]:bg-transparent',
            content: ({ itemAttributes }) => [
              h.block(
                ControlsHighlight.embedView({
                  slotId: controlsHighlight.id,
                  model: controlsHighlight,
                  viewInputs: {
                    mode: settings.hover,
                    className: resolvePresentation({ context }).shape.input,
                    animate: highlight,
                  },
                }),
              ),
              ...controls.flatMap((control, index) => [
                ...(index === 0 || controls[index - 1]?.model.group !== control.model.group
                  ? [
                      h.h4(
                        [h.Class('px-2 pb-1 pt-2 text-site-body text-foreground')],
                        [control.model.group],
                      ),
                    ]
                  : []),
                h.div(
                  [
                    h.Class('relative z-10'),
                    ...(control.model.kind === 'choice' || control.model.kind === 'toggle'
                      ? itemAttributes(
                          index,
                          control.model.kind === 'choice'
                            ? control.model.select.disabled
                            : control.model.toggle.disabled,
                        )
                      : []),
                  ],
                  [
                    h.block(
                      Controls.embedView({
                        key: control.key,
                        slotId: `prop-${control.key}`,
                        model: control.model,
                        viewInputs: { settings: settings, ready },
                      }),
                    ),
                  ],
                ),
              ]),
            ],
          },
        }),
      ),
    ],
  )
}
export const playgroundToolbar = (
  model: Model['previewTabs'],
  inspector: Model['inspector'],
  shape: Settings['shape'],
  size: Settings['size'],
  hover: Settings['hover'],
  h: H,
) =>
  h.div(
    [h.Class(previewToolbar)],
    [
      h.block(
        PlaygroundTabs.embedView({
          slotId: model.id,
          model,
          viewInputs: previewCodeTabsViewInputs(h, {
            context: presentation({ shape, size, hover }),
            animate: target.node,
            ariaLabel: 'Playground view',
          }),
        }),
      ),
      h.block(
        Inspector.embedView({
          slotId: 'playground-inspector',
          model: inspector,
          viewInputs: {
            context: presentation({ shape, size, hover }),
            animate: (node, animation) =>
              typeof window === 'undefined' ? node : switchMotion.node(node, animation),
          },
        }),
      ),
    ],
  )
