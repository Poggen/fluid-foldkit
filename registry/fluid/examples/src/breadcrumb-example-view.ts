import { Button } from '@foldkit/ui'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs'
import { docSection } from './doc-section.js'
import source from './breadcrumb-example-view.ts?raw'
import { Match, Option, Predicate } from 'effect'
import { childAttributes } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import {
  BreadcrumbButton,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from '@foldkit-visuals/fluid/breadcrumb'
import type {
  BreadcrumbContext,
  BreadcrumbCrumbProps,
  BreadcrumbElementRenderer,
} from '@foldkit-visuals/fluid/breadcrumb'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import {
  BreadcrumbExampleComposition,
  DocTabs,
  Message,
  Menus,
  Tooltips,
  Trails,
  motion,
  rootAttributes,
} from './breadcrumb-example-block.js'
import { MENU_CLASS, hiddenLabel, sections } from './breadcrumb-example-data.js'
import { playgroundControls } from './breadcrumb-example-controls.js'
import { trailChildren } from './breadcrumb-example-trails.js'

export const view = BreadcrumbExampleComposition.makeView((model, h) => {
  const documentationTabs = (key: string) => {
    const child = model.docTabs[key]
    return child === undefined
      ? h.empty
      : h.block(
          DocTabs.embedView({
            key,
            slotId: child.tabs.id,
            model: child,
            viewInputs: previewCodeTabsViewInputs(h, {
              shape: model.shape,
              size: model.docSize,
              hoverMode: model.mode,
              animate: motion.node,
              ariaLabel: `${key} example`,
            }),
          }),
        )
  }
  const renderers = new Map<
    string,
    {
      readonly kind: 'link' | 'button' | 'page'
      readonly render: (element?: BreadcrumbElementRenderer) => Html
    }
  >()

  const icon = (
    key: Parameters<ReturnType<typeof resolvePresentation>['icons']['home']>[0],
    name: keyof ReturnType<typeof resolvePresentation>['icons'],
  ) => resolvePresentation({ shape: model.shape }).icons[name](key, h)

  const item = (child: Html) => BreadcrumbItem({ children: [child] }, h)

  return h.block(
    Tooltips.embedView({
      slotId: 'breadcrumb-tooltips',
      model: model.tooltips,
      viewInputs: {
        renderTrigger: (key, { anchor, button, span }) => {
          const entry = renderers.get(key)

          if (!entry) {
            throw new Error(`Missing breadcrumb tooltip ${key}`)
          }

          return entry.render(
            Match.value(entry.kind).pipe(
              Match.when('link', () => anchor),
              Match.when('button', () => button),
              Match.when('page', () => span),
              Match.exhaustive,
            ),
          )
        },
        renderDocument: (content, popups) => h.div([], [content, ...popups]),
        render: ({ tooltip }) => {
          const makeTooltip: NonNullable<BreadcrumbContext['tooltip']> = ({
            id,
            text,
            enabled,
            kind,
            render,
          }) => {
            if (!enabled) {
              return render()
            }

            renderers.set(id, { kind, render })

            return tooltip(id, {
              content: text,
              shapeClass: model.shape === 'sharp' ? 'rounded-[1px]' : 'rounded-lg',
              animate: motion.node,
              reducedMotion: 'user',
            })
          }

          const link = (
            context: BreadcrumbContext,
            demo: string,
            index: number,
            label: string,
            children: ReadonlyArray<Html | string> = [label],
            href = '#',
            framework = false,
          ) => {
            const base = { id: `${demo}-${index}`, href, children }

            const props =
              children.length === 1 && !Predicate.isString(children[0])
                ? { ...base, attributes: childAttributes([h.AriaLabel(label)]) }
                : base

            const render: NonNullable<BreadcrumbCrumbProps['render']> = (
              attributes,
              content,
              element,
            ) => (element ? element(attributes, content) : h.a(attributes, content))

            return item(BreadcrumbLink(framework ? { ...props, render } : props, context, h))
          }

          const page = (
            context: BreadcrumbContext,
            demo: string,
            label = 'Breadcrumb',
            children: ReadonlyArray<Html | string> = [label],
          ) => item(BreadcrumbPage({ id: `${demo}-7`, children }, context, h))

          const menu = (
            key: string,
            context: BreadcrumbContext,
            labels: ReadonlyArray<string>,
            openOnHover: boolean,
            ellipsis: boolean,
            leading?: Html,
            displayLabel?: string,
          ): Html => {
            const child = model.menus[key]

            if (!child) {
              return h.empty
            }

            const open = child.controller.phase === 'open'
            const selected = Option.getOrElse(child.controller.checkedIndex, () => 0)

            const trigger = (attributes: Parameters<typeof BreadcrumbButton>[0]['attributes']) =>
              BreadcrumbButton(
                {
                  id: `${key}-trigger`,
                  open,
                  attributes: ellipsis
                    ? [
                        ...(attributes ?? []),
                        ...childAttributes([h.AriaLabel(`Show ${hiddenLabel(labels.length)}`)]),
                      ]
                    : (attributes ?? []),
                  children: ellipsis
                    ? [BreadcrumbEllipsis({}, h)]
                    : [
                        ...(leading ? [leading] : []),
                        displayLabel ?? labels[selected] ?? labels[0] ?? '',
                      ],
                },
                context,
                h,
              )

            return h.block(
              Menus.embedView({
                key,
                slotId: key,
                model: child,
                viewInputs: {
                  shape: model.shape,
                  openOnHover,
                  animate: motion.node,
                  contentClassName: MENU_CLASS,
                  trigger: (attributes) => {
                    if (!ellipsis || openOnHover || open) {
                      return trigger(attributes)
                    }

                    renderers.set(key, {
                      kind: 'button',
                      render: (element) =>
                        BreadcrumbButton(
                          {
                            id: key,
                            open,
                            attributes: [
                              ...attributes,
                              ...childAttributes([
                                h.AriaLabel(`Show ${hiddenLabel(labels.length)}`),
                              ]),
                            ],
                            children: [BreadcrumbEllipsis({}, h)],
                            render: (own, children) =>
                              element ? element(own, children) : h.button(own, children),
                          },
                          context,
                          h,
                        ),
                    })

                    return tooltip(key, {
                      content: hiddenLabel(labels.length),
                      shapeClass: model.shape === 'sharp' ? 'rounded-[1px]' : 'rounded-lg',
                      animate: motion.node,
                      reducedMotion: 'user',
                    })
                  },
                  content: (menuContext) =>
                    labels.map((label, index) => {
                      const props = { index, label, animate: motion.node }

                      return DropdownItem(
                        ellipsis ? props : { ...props, checked: selected === index },
                        menuContext,
                        h,
                      )
                    }),
                },
              }),
            )
          }

          const demo = (key: string): Html => {
            const child = model.trails[key]

            if (!child) {
              return h.empty
            }

            const separator =
              key === 'separator' || (key === 'playground' && model.settings.separator === 'slash')
                ? '/'
                : undefined

            return h.block(
              Trails.embedView({
                key,
                slotId: key,
                model: child,
                viewInputs: {
                  shape: model.shape,
                  animate: motion.node,
                  tooltip: makeTooltip,
                  separator,
                  content: (context) => {
                    const children = trailChildren(
                      {
                        model,
                        h,
                        icon,
                        item,
                        link,
                        page,
                        menu,
                        expandMessage: Message.ClickedExpanded({ expanded: true }),
                        playgroundExpandMessage: Message.ClickedPlaygroundExpanded({
                          expanded: true,
                        }),
                      },
                      context,
                      key,
                    )

                    return [
                      BreadcrumbList(
                        {
                          ...context,
                          className: key === 'playground' ? 'justify-center' : '',
                          children,
                        },
                        h,
                      ),
                    ]
                  },
                },
              }),
            )
          }

          const subject = (key: string): Html => {
            if (key === 'playground') {
              return h.div(
                [
                  h.Class(
                    'grid grid-cols-[240px_minmax(0,1fr)] gap-4 [@media_(max-width:_640px)]:grid-cols-[minmax(0,1fr)] [&_.breadcrumb-preview]:min-h-70',
                  ),
                ],
                [
                  playgroundControls(model, h),
                  h.div(
                    [
                      h.Class(
                        'breadcrumb-preview relative [border:1px_solid_var(--border)] rounded-[12px] min-h-30 p-12 flex justify-center items-center [@media_(max-width:_640px)]:p-[48px_16px] min-h-[280px] rounded-(--fluid-border-radius)',
                      ),
                      h.Style({
                        '--fluid-border-radius': `${resolvePresentation({ shape: model.shape }).shape.containerRadius}px`,
                      }),
                    ],
                    [
                      h.div([h.Class('w-full max-w-md min-w-0')], [demo(key)]),
                      ...(model.settings.reveal === 'expand' && model.settings.collapse !== 'never'
                        ? [
                            Button.view(
                              {
                                onClick: Message.ClickedPlaygroundExpanded({ expanded: false }),
                                type: 'button',
                                toView: (attributes) =>
                                  h.button(
                                    [
                                      ...attributes.button,
                                      h.Class('absolute bottom-3 right-3 text-[12px]'),
                                    ],
                                    ['Replay'],
                                  ),
                              },
                              h,
                            ),
                          ]
                        : []),
                    ],
                  ),
                ],
              )
            }

            if (key === 'overflow') {
              return h.div(
                [h.Class('flex w-full flex-col items-center gap-2')],
                [
                  h.div(
                    [
                      h.Class(
                        'relative max-w-full rounded-lg border border-dashed border-border px-2 py-1',
                      ),
                      h.Style({ width: `${model.width}px` }),
                    ],
                    [
                      demo(key),
                      h.div(
                        [
                          h.DataAttribute('breadcrumb-resize', ''),
                          h.Role('separator'),
                          h.AriaOrientation('vertical'),
                          h.AriaLabel('Resize'),
                          h.AriaValuemin(200),
                          h.AriaValuemax(560),
                          h.AriaValuenow(model.width),
                          h.Tabindex(0),
                          h.OnKeyDownPreventDefault((keyboardKey) => {
                            if (keyboardKey === 'ArrowLeft') {
                              return Option.some(
                                Message.Resized({ width: Math.max(200, model.width - 20) }),
                              )
                            }

                            if (keyboardKey === 'ArrowRight') {
                              return Option.some(
                                Message.Resized({ width: Math.min(560, model.width + 20) }),
                              )
                            }

                            return Option.none()
                          }),
                          h.Class(
                            'absolute top-1/2 -right-1.5 flex h-8 w-3 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full bg-background outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
                          ),
                        ],
                        [h.span([h.Class('h-5 w-1 rounded-full bg-muted-foreground')])],
                      ),
                    ],
                  ),
                  h.p([h.Class('text-[12px] text-muted-foreground')], ['Drag the edge to resize']),
                ],
              )
            }

            if (key === 'expand') {
              return h.div(
                [h.Class('flex flex-col items-center gap-3')],
                [
                  demo(key),
                  ...(model.isExpanded
                    ? [
                        Button.view(
                          {
                            onClick: Message.ClickedExpanded({ expanded: false }),
                            type: 'button',
                            toView: (attributes) =>
                              h.button(
                                [
                                  ...attributes.button,
                                  h.Class(
                                    'text-[12px] text-muted-foreground underline underline-offset-2',
                                  ),
                                ],
                                ['Collapse again'],
                              ),
                          },
                          h,
                        ),
                      ]
                    : []),
                ],
              )
            }

            return demo(key)
          }

          return (model.isDocEmbedded ? h.div : h.main)(
            [
              h.Class(
                model.isDocEmbedded
                  ? ''
                  : 'max-w-240 m-[0_auto] p-[48px_24px_96px] [&_h1]:m-[24px_0_8px] [&_h1]:text-[28px] [&_h2]:m-[32px_0_12px] [&_h2]:text-[20px] [&_p]:[color:var(--muted-foreground)]',
              ),
              h.OnMount(rootAttributes()),
            ],
            [
              model.isDocEmbedded ? null : h.h1([], ['Breadcrumb']),
              ...sections
                .filter(({ id }) => !model.isDocEmbedded || id !== 'playground')
                .map(({ id, title }) =>
                  docSection(h, {
                    title,
                    children: [subject(id)],
                    source,
                    presentation: {
                      shape: model.shape,
                      size: model.docSize,
                      hoverMode: model.mode,
                    },
                    pane: model.docTabs[id]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
                    tabs: documentationTabs(id),
                    tabsId: previewCodeTabId('breadcrumb', id),
                  }),
                ),
            ],
          )
        },
      },
    }),
  )
})
