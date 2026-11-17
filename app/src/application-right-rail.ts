import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { Option } from 'effect'
import type { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import { pageAt } from '../../lib/catalogue'
import type { ApplicationComposition, applicationViewBindings } from './application'
import { applicationClasses } from './application-classes'
import type { ApplicationBlock, Message } from './application-contract'
import { readReference } from './reference/query'
import type { presentation, ResolvedSettings } from './settings'

export const makeRenderRightRail =
  ({
    RightRailScroll,
    Preferences,
    Reference,
  }: Pick<typeof applicationViewBindings, 'RightRailScroll' | 'Preferences' | 'Reference'>) =>
  (
    model: typeof ApplicationBlock.Model.Type,
    h: Block.ViewBuilderFor<typeof ApplicationComposition>,
    {
      context,
      settings,
      renderPreview,
      previewReady,
      onCopyInstall,
    }: {
      readonly context: ReturnType<typeof presentation>
      readonly settings: ResolvedSettings
      readonly renderPreview: () => Html
      readonly previewReady: boolean
      readonly onCopyInstall: typeof Message.Type
    },
  ) => {
    const page = pageAt(model.path)
    const reference = Option.getOrUndefined(model.maybeReference)
    return h.aside(
      [
        h.Id('site-customizer'),
        h.AriaLabel('Customization'),
        h.Class(applicationClasses.customizer),
        h.DataAttribute('site-right-panel', ''),
        h.Style({ width: '264px', marginLeft: '-4px', marginRight: '12px' }),
        h.DataAttribute(
          'font-picker-return',
          String(model.fontPicker.returnFocusId === 'customize-desktop-font-select-trigger'),
        ),
      ],
      [
        h.div(
          [h.Class('w-[264px]')],
          [
            h.block(
              RightRailScroll.embedView({
                slotId: 'right-rail-scroll',
                model: model.rightRailScroll,
                viewInputs: {
                  context,
                  viewportClassName: 'scroll-fade max-h-[calc(100svh-2rem-48px)]',
                  children: [],
                  content: () => [
                    h.div(
                      [h.Class('flex flex-col px-1')],
                      [
                        h.aside(
                          [h.Class('contain-inline-size')],
                          [
                            h.div(
                              [h.Class('flex h-8 items-center justify-between pl-2')],
                              [
                                h.h2(
                                  [h.Class('text-site-caption text-foreground')],
                                  ['Make them yours'],
                                ),
                              ],
                            ),
                            h.block(
                              Preferences.embedView({
                                slotId: 'preferences',
                                model: model.preferences,
                                viewInputs: { settings: model.settings },
                              }),
                            ),
                            h.div(
                              [h.Class('mt-3 ')],
                              [
                                Button(
                                  {
                                    context,
                                    children: ['Copy install prompt'],
                                    leadingIcon: model.copyFeedback.sidebar.complete
                                      ? defaultIcons.check
                                      : defaultIcons.copy,
                                    className: 'w-full',
                                    attributes: [h.OnClick(onCopyInstall)],
                                  },
                                  h,
                                ),
                              ],
                            ),
                          ],
                        ),
                        ...(page !== undefined && reference !== undefined && model.columns === 3
                          ? [
                              h.block(
                                Reference.embedView({
                                  key: reference.key,
                                  slotId: 'reference-controls',
                                  model: reference.model,
                                  viewInputs: {
                                    reference: readReference(model.referenceQuery, model.path),
                                    renderPreview,
                                    previewReady,
                                    settings: settings,
                                    part: 'controls',
                                  },
                                }),
                              ),
                            ]
                          : []),
                      ],
                    ),
                  ],
                },
              }),
            ),
            h.div(
              [h.Class(applicationClasses.credit)],
              [
                h.a(
                  [
                    h.Href('https://www.fluidfunctionalism.com'),
                    h.Target('_blank'),
                    h.Rel('noopener noreferrer'),
                  ],
                  ['Original by @micka_design ↗'],
                ),
              ],
            ),
          ],
        ),
      ],
    )
  }
