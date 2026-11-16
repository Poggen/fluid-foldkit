import { createLazy } from 'foldkit/html'
import { Schema } from 'effect'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { ColorTile } from '@foldkit-visuals/fluid/color-picker'
import { Button } from '@foldkit-visuals/fluid/button'
import { SidebarFooter } from '@foldkit-visuals/fluid/sidebar/parts'
import { highlight, target } from './motion'
import { Settings, accentColor, presentation } from './settings'
import type { PreferencesBlock, PreferencesHtml, preferencesViewBindings } from './preferences'

type Model = typeof PreferencesBlock.Model.Type

export const makeRenderPreferences = (bindings: typeof preferencesViewBindings) => {
  const { Theme, Accent, Font, Shape, Size, Hover, RowHover, RowHighlight, reset } = bindings
  const lazyTheme = createLazy()
  const renderTheme = (
    model: Model['theme'],
    shape: Settings['shape'],
    size: Settings['size'],
    hover: Settings['hover'],
    h: PreferencesHtml,
  ) =>
    h.block(
      Theme.embedView({
        slotId: 'preferences-theme',
        model,
        viewInputs: {
          context: presentation({ shape, size, hover }),
          variant: 'borderless',
          className: 'min-w-0 w-auto px-2 text-site-body',
          ariaLabel: 'Theme',
          animate: target.node,
        },
      }),
    )
  const lazyAccent = createLazy()
  const renderAccent = (
    model: Model['accent'],
    theme: Settings['theme'],
    shape: Settings['shape'],
    size: Settings['size'],
    hover: Settings['hover'],
    h: PreferencesHtml,
  ) =>
    h.block(
      Accent.embedView({
        slotId: 'preferences-accent',
        model,
        viewInputs: {
          context: presentation({ shape, size, hover }),
          variant: 'borderless',
          className: 'min-w-0 w-auto px-2 text-site-body',
          ariaLabel: 'Accent',
          renderIcon: (item) =>
            ColorTile(
              {
                context: presentation({ shape, size, hover }),
                size: size === 'compact' ? 16 : 20,
                color:
                  item.value === 'custom'
                    ? 'var(--fluid-accent)'
                    : Schema.is(Settings.fields.accent)(item.value)
                      ? accentColor(item.value, theme)
                      : 'transparent',
              },
              h,
            ),
          animate: target.node,
        },
      }),
    )
  const lazyShape = createLazy()
  const renderShape = (
    model: Model['shape'],
    shape: Settings['shape'],
    size: Settings['size'],
    hover: Settings['hover'],
    h: PreferencesHtml,
  ) =>
    h.block(
      Shape.embedView({
        slotId: 'preferences-shape',
        model,
        viewInputs: {
          context: presentation({ shape, size, hover }),
          variant: 'borderless',
          className: 'min-w-0 w-auto px-2 text-site-body',
          ariaLabel: 'Radius',
          animate: target.node,
        },
      }),
    )
  const lazySize = createLazy()
  const renderSize = (
    model: Model['size'],
    shape: Settings['shape'],
    size: Settings['size'],
    hover: Settings['hover'],
    h: PreferencesHtml,
  ) =>
    h.block(
      Size.embedView({
        slotId: 'preferences-size',
        model,
        viewInputs: {
          context: presentation({ shape, size, hover }),
          variant: 'borderless',
          className: 'min-w-0 w-auto px-2 text-site-body',
          ariaLabel: 'Size',
          animate: target.node,
        },
      }),
    )
  const lazyHover = createLazy()
  const renderHover = (
    model: Model['hover'],
    shape: Settings['shape'],
    size: Settings['size'],
    hover: Settings['hover'],
    h: PreferencesHtml,
  ) =>
    h.block(
      Hover.embedView({
        slotId: 'preferences-hover',
        model,
        viewInputs: {
          context: presentation({ shape, size, hover }),
          variant: 'borderless',
          className: 'min-w-0 w-auto px-2 text-site-body',
          ariaLabel: 'Hover',
          animate: target.node,
        },
      }),
    )
  return (model: Model, { settings }: { readonly settings: Settings }, h: PreferencesHtml) => {
    const context = presentation(settings)
    const themeView = lazyTheme(renderTheme, [
      model.theme,
      settings.shape,
      settings.size,
      settings.hover,
      h,
    ])
    const accentView = lazyAccent(renderAccent, [
      model.accent,
      settings.theme,
      settings.shape,
      settings.size,
      settings.hover,
      h,
    ])
    const shapeView = lazyShape(renderShape, [
      model.shape,
      settings.shape,
      settings.size,
      settings.hover,
      h,
    ])
    const sizeView = lazySize(renderSize, [
      model.size,
      settings.shape,
      settings.size,
      settings.hover,
      h,
    ])
    const hoverView = lazyHover(renderHover, [
      model.hover,
      settings.shape,
      settings.size,
      settings.hover,
      h,
    ])
    return h.div(
      [h.DataAttribute('customizer-content', '')],
      [
        h.block(
          RowHover.embedView({
            slotId: model.rowHover.id,
            model: model.rowHover,
            viewInputs: {
              className: 'relative flex flex-col',
              content: ({ itemAttributes }) => [
                h.block(
                  RowHighlight.embedView({
                    slotId: model.rowHighlight.id,
                    model: model.rowHighlight,
                    viewInputs: {
                      mode: model.rowHover.mode,
                      className: resolvePresentation({ context }).shape.input,
                      animate: highlight,
                    },
                  }),
                ),
                h.div(
                  [
                    h.Class('relative flex items-center justify-between gap-3 pl-2'),
                    ...itemAttributes(0, model.theme.disabled),
                  ],
                  [
                    h.span(
                      [h.Class('shrink-0 whitespace-nowrap text-site-body text-muted-foreground')],
                      ['Theme'],
                    ),
                    themeView,
                  ],
                ),
                h.div(
                  [
                    h.Class('relative flex items-center justify-between gap-3 pl-2'),
                    ...itemAttributes(1, model.accent.disabled),
                  ],
                  [
                    h.span(
                      [h.Class('shrink-0 whitespace-nowrap text-site-body text-muted-foreground')],
                      ['Accent'],
                    ),
                    accentView,
                  ],
                ),
                h.block(
                  Font.embedView({
                    slotId: 'preferences-font',
                    model: model.font,
                    viewInputs: {
                      settings,
                      fontRow: (view) =>
                        h.div(
                          [
                            h.Class('relative flex items-center justify-between gap-3 pl-2'),
                            ...itemAttributes(2, false),
                          ],
                          [
                            h.span(
                              [
                                h.Class(
                                  'shrink-0 whitespace-nowrap text-site-body text-muted-foreground',
                                ),
                              ],
                              ['Heading font'],
                            ),
                            view,
                          ],
                        ),
                      weightRow: (view) =>
                        h.div(
                          [
                            h.Class('relative flex items-center justify-between gap-3 pl-2'),
                            ...itemAttributes(3, settings.font !== 'custom'),
                          ],
                          [
                            h.span(
                              [
                                h.Class(
                                  'shrink-0 whitespace-nowrap text-site-body text-muted-foreground',
                                ),
                              ],
                              ['Heading weight'],
                            ),
                            view,
                          ],
                        ),
                    },
                  }),
                ),
                h.div(
                  [
                    h.Class('relative flex items-center justify-between gap-3 pl-2'),
                    ...itemAttributes(4, model.shape.disabled),
                  ],
                  [
                    h.span(
                      [h.Class('shrink-0 whitespace-nowrap text-site-body text-muted-foreground')],
                      ['Radius'],
                    ),
                    shapeView,
                  ],
                ),
                h.div(
                  [
                    h.Class('relative flex items-center justify-between gap-3 pl-2'),
                    ...itemAttributes(5, model.size.disabled),
                  ],
                  [
                    h.span(
                      [h.Class('shrink-0 whitespace-nowrap text-site-body text-muted-foreground')],
                      ['Size'],
                    ),
                    sizeView,
                  ],
                ),
                h.div(
                  [
                    h.Class('relative flex items-center justify-between gap-3 pl-2'),
                    ...itemAttributes(6, model.hover.disabled),
                  ],
                  [
                    h.span(
                      [h.Class('shrink-0 whitespace-nowrap text-site-body text-muted-foreground')],
                      ['Hover'],
                    ),
                    hoverView,
                  ],
                ),
              ],
            },
          }),
        ),
        SidebarFooter(
          {
            className:
              'mt-6.5 pt-0 pr-0 pb-0 pl-0 gap-3 [&_p]:text-[11px] [&_p]:leading-[1.7] [&_p]:text-muted-foreground [&_p]:mb-2.5 ',
            children: [
              h.p([], ['Native Foldkit components. Your preferences travel with the URL.']),
              Button(
                {
                  context,
                  variant: 'secondary',
                  children: ['Reset customization'],
                  attributes: [h.OnClick(reset())],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    )
  }
}
