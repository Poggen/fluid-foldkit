import { Button } from '@foldkit-visuals/fluid/button'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import type { HtmlBuilder } from 'foldkit/html'
import type { ComponentPage } from '../../lib/catalogue'
import { installationRouter, introductionRouter } from './route'
import type { Settings } from './settings'
import { presentation } from './settings'
export const hero = <Message>(
  page: ComponentPage | undefined,
  settings: Settings,
  copied: boolean,
  onCopy: Message,
  h: HtmlBuilder<Message>,
) => {
  const context = presentation(settings)
  if (page !== undefined)
    return h.header(
      [h.Class('contents doc-heading')],
      [
        h.div(
          [],
          [
            h.h1([h.Class('text-site-display text-foreground leading-none')], [page.name]),
            h.p([h.Class('mt-2 text-site-body text-muted-foreground')], [page.description]),
          ],
        ),
        h.div(
          [h.Class('flex items-center justify-between gap-4')],
          [
            h.div(
              [],
              [
                h.h2([h.Class('text-site-title text-foreground leading-none')], ['Installation']),
                h.p(
                  [h.Class('text-site-body text-muted-foreground')],
                  ['Native Foldkit components. Install from the registry.'],
                ),
              ],
            ),
            Button(
              {
                context,
                variant: 'primary',
                leadingIcon: copied ? defaultIcons.check : defaultIcons.copy,
                children: ['Copy prompt'],
                attributes: [h.OnClick(onCopy)],
              },
              h,
            ),
          ],
        ),
      ],
    )
  return h.header(
    [h.Class('w-full max-w-[680px] mx-auto py-20 sm:py-28 px-6')],
    [
      h.p([h.Class('hidden ')], ['FLUID × BKLIT · FOR FOLDKIT']),
      h.h1([h.Class('text-site-display text-foreground leading-none')], ['Fluid Functionalism']),
      h.p(
        [h.Class('mt-2 text-site-body text-muted-foreground')],
        ['Refined UI components with satisfying hover.'],
      ),
      h.div(
        [h.Class('mt-4 flex flex-wrap items-center gap-2')],
        [
          Button(
            {
              context,
              buttonSize: 'sm',
              leadingIcon: copied ? defaultIcons.check : defaultIcons.copy,
              children: ['Copy install prompt'],
              attributes: [h.OnClick(onCopy)],
            },
            h,
          ),
          Button(
            {
              context,
              variant: 'secondary',
              buttonSize: 'sm',
              children: ['Learn more'],
              render: (attrs, children) => h.a([...attrs, h.Href(installationRouter())], children),
            },
            h,
          ),
          Button(
            {
              context,
              variant: 'ghost',
              buttonSize: 'sm',
              children: ['See demo'],
              render: (attrs, children) => h.a([...attrs, h.Href(introductionRouter())], children),
            },
            h,
          ),
        ],
      ),
    ],
  )
}
