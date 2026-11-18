import { Option } from 'effect'
import { childAttributes } from 'foldkit/html'
import type { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import { BreadcrumbButton, BreadcrumbEllipsis } from '@foldkit-visuals/fluid/breadcrumb'
import type { BreadcrumbContext } from '@foldkit-visuals/fluid/breadcrumb'
import type { IconOptions } from '@foldkit-visuals/fluid/presentation'
import type { IconName } from '@foldkit-visuals/fluid/icons'
import type { BreadcrumbExampleComposition, Model, Message } from './breadcrumb-example-block.js'
import {
  HIDDEN,
  LINKS,
  LONG_REPORT,
  LONG_STEP,
  OVERFLOW_STEPS,
  PAGE,
  SECTIONS,
  SIBLINGS,
  TRAIL,
} from './breadcrumb-example-data.js'

export interface TrailRenderers {
  readonly expandMessage: typeof Message.Type
  readonly playgroundExpandMessage: typeof Message.Type
  readonly model: typeof Model.Type
  readonly h: Block.ViewBuilderFor<typeof BreadcrumbExampleComposition>
  readonly icon: (options: IconOptions, name: IconName) => Html
  readonly item: (child: Html) => Html
  readonly link: (
    context: BreadcrumbContext,
    demo: string,
    index: number,
    label: string,
    children?: ReadonlyArray<Html | string>,
    href?: string,
    framework?: boolean,
  ) => Html
  readonly page: (
    context: BreadcrumbContext,
    demo: string,
    label?: string,
    children?: ReadonlyArray<Html | string>,
  ) => Html
  readonly menu: (
    key: string,
    context: BreadcrumbContext,
    labels: ReadonlyArray<string>,
    openOnHover: boolean,
    ellipsis: boolean,
    leading?: Html,
    displayLabel?: string,
  ) => Html
}

const playgroundChildren: (
  renderers: TrailRenderers,
  context: BreadcrumbContext & { readonly expanded: boolean; readonly hiddenCount: number },
  key: string,
) => ReadonlyArray<Html> = (
  renderers: TrailRenderers,
  context: BreadcrumbContext & { readonly expanded: boolean; readonly hiddenCount: number },
  key: string,
) => {
  const { model, h, icon, item, link, page, menu } = renderers

  const { settings } = model
  const links = LINKS.slice(0, settings.steps - 1).map((value) => ({ ...value }))
  const dropdownIndex = settings.dropdownStep && links.length >= 2 ? links.length - 1 : -1
  const step = model.menus['playground-step']
  const sibling = step ? Option.getOrElse(step.controller.checkedIndex, () => 0) : 0

  if (dropdownIndex >= 0 && links[dropdownIndex]) {
    links[dropdownIndex].label = SIBLINGS[sibling] ?? 'Drafts'
  }

  if (settings.longName && links[1]) {
    links[1].label = LONG_STEP
  }

  let hiddenCount = 0

  if (!context.expanded) {
    if (settings.collapse === 'always' && links.length >= 4) {
      hiddenCount = links.length - 2
    }

    if (settings.collapse === 'overflow') {
      hiddenCount = Math.min(context.hiddenCount, Math.max(0, links.length - 2))
    }
  }

  const children = [
    ...links.flatMap((value, index) => {
      if (index >= 1 && index <= hiddenCount) {
        if (index !== 1) {
          return []
        }

        return [
          item(
            settings.reveal === 'menu'
              ? menu(
                  'playground-hidden',
                  context,
                  links.slice(1, hiddenCount + 1).map((entry) => entry.label),
                  settings.openOnHover,
                  true,
                )
              : BreadcrumbButton(
                  {
                    id: 'playground-expand',
                    attributes: childAttributes([
                      h.AriaLabel('Show full path'),
                      h.OnClick(renderers.playgroundExpandMessage),
                    ]),
                    children: [BreadcrumbEllipsis({}, h)],
                  },
                  context,
                  h,
                ),
          ),
        ]
      }

      if (index === dropdownIndex) {
        return [
          item(
            menu(
              'playground-step',
              context,
              SIBLINGS,
              settings.openOnHover,
              false,
              settings.icons ? icon({}, value.icon) : undefined,
              value.label,
            ),
          ),
        ]
      }

      let labelChildren: ReadonlyArray<Html | string> = [value.label]

      if (settings.icons) {
        labelChildren = index === 0 ? [icon({}, value.icon)] : [icon({}, value.icon), value.label]
      }

      return [link(context, key, index, value.label, labelChildren)]
    }),
    page(context, key, PAGE, settings.icons ? [icon({}, 'file'), PAGE] : [PAGE]),
  ]

  return children
}

export const trailChildren: (
  renderers: TrailRenderers,
  context: BreadcrumbContext & { readonly expanded: boolean; readonly hiddenCount: number },
  key: string,
) => ReadonlyArray<Html> = (
  renderers: TrailRenderers,
  context: BreadcrumbContext & { readonly expanded: boolean; readonly hiddenCount: number },
  key: string,
) => {
  const { model, h, icon, item, link, page, menu } = renderers

  const fileText = () =>
    h.svg(
      [
        h.ViewBox('0 0 24 24'),
        h.Width('24'),
        h.Height('24'),
        h.Fill('none'),
        h.Stroke('currentColor'),
        h.StrokeWidth('2'),
        h.StrokeLinecap('round'),
        h.StrokeLinejoin('round'),
      ],
      [
        'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
        'M14 2v5a1 1 0 0 0 1 1h5',
        'M10 9H8',
        'M16 13H8',
        'M16 17H8',
      ].map((d) => h.path([h.D(d)])),
    )

  let children: Array<Html>

  if (key === 'icons') {
    children = [
      link(context, key, 0, 'Home', [icon({}, 'home')]),
      link(context, key, 1, 'Projects', [icon({}, 'folder'), 'Projects']),
      link(context, key, 2, 'Website', [icon({}, 'globe'), 'Website']),
      link(context, key, 3, 'Design', [icon({}, 'palette'), 'Design']),
      page(context, key, PAGE, [fileText(), PAGE]),
    ]
  } else if (key === 'long') {
    children = [
      link(context, key, 0, 'Home'),
      link(context, key, 1, LONG_REPORT),
      page(context, key, 'Summary'),
    ]
  } else if (key === 'dropdown') {
    children = [
      link(context, key, 0, 'Home'),
      item(menu('dropdown-step', context, SECTIONS, true, false)),
      page(context, key),
    ]
  } else if (key === 'click') {
    children = [
      link(context, key, 0, 'Home'),
      item(menu('click-hidden', context, HIDDEN, false, true)),
      item(menu('click-step', context, SECTIONS, false, false)),
      page(context, key),
    ]
  } else if (key === 'collapsed') {
    children = [
      link(context, key, 0, 'Home'),
      item(menu('collapsed-hidden', context, HIDDEN, true, true)),
      link(context, key, 1, 'Components'),
      page(context, key),
    ]
  } else if (key === 'overflow') {
    children = [
      ...OVERFLOW_STEPS.flatMap((label, index) =>
        index >= 1 && index <= context.hiddenCount
          ? []
          : [
              link(context, key, index, label),
              ...(index === 0 && context.hiddenCount > 0
                ? [
                    item(
                      menu(
                        'overflow-hidden',
                        context,
                        OVERFLOW_STEPS.slice(1, context.hiddenCount + 1),
                        true,
                        true,
                      ),
                    ),
                  ]
                : []),
            ],
      ),
      page(context, key, PAGE),
    ]
  } else if (key === 'expand') {
    children = [
      ...TRAIL.flatMap((label, index) =>
        !model.isExpanded && index > 0 && index < TRAIL.length - 1
          ? []
          : [
              ...(!model.isExpanded && index === TRAIL.length - 1
                ? [
                    item(
                      BreadcrumbButton(
                        {
                          id: 'expand-button',
                          attributes: childAttributes([
                            h.AriaLabel('Show full path'),
                            h.OnClick(renderers.expandMessage),
                          ]),
                          children: [BreadcrumbEllipsis({}, h)],
                        },
                        context,
                        h,
                      ),
                    ),
                  ]
                : []),
              link(context, key, index, label),
            ],
      ),
      page(context, key),
    ]
  } else if (key === 'framework') {
    children = [
      link(context, key, 0, 'Button', ['Button'], '/docs/button', true),
      link(context, key, 1, 'Dropdown', ['Dropdown'], '/docs/dropdown', true),
      page(context, key),
    ]
  } else if (key === 'playground') {
    children = [...playgroundChildren(renderers, context, key)]
  } else {
    children = [link(context, key, 0, 'Home'), link(context, key, 1, 'Docs'), page(context, key)]
  }

  return children
}
