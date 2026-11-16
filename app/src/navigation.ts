import type { ScrollAreaProps } from '@foldkit-visuals/fluid/scroll-area'
import { ScrollAreaBlock, layer as ScrollLayer } from '@foldkit-visuals/fluid/scroll-area'
import { NavMenuBlock, hoverModeOf, navMenuLayer } from '@foldkit-visuals/fluid/nav-menu'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import {
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuBadge,
} from '@foldkit-visuals/fluid/sidebar/parts'
import { Effect, Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { chartPages, fluidPages, guidePages, systemPages } from '../../lib/catalogue'
import { SiteEnvironment } from './environment'
import { highlight, motion } from './motion'
import { Settings, presentation } from './settings'
const key = Symbol('SiteNavigation')
const Message = defineMessageUnion({
  CompletedCapturePlatform: { mac: Schema.Boolean },
})
const OutMessage = defineMessageUnion({ RequestedSearch: {} })
const InMessage = defineInMessageUnion({
  InformedOfPage: { path: Schema.String },
  InformedOfHoverMode: { mode: Settings.fields.hover },
})
const navItems = (items: ReadonlyArray<{ readonly href: string; readonly name: string }>) =>
  items.map((item) => ({
    value: item.href,
    href: item.href,
    label: item.name,
    disabled: false,
    status: null,
    badge: null,
    level: 0,
  }))
export const NavigationBlock = Block.make('Navigation', {
  key,
  InitArgs: Schema.Tuple([
    Settings,
    Schema.String,
    Schema.String,
    Schema.Literals(['desktop', 'mobile']),
  ]),
  ChildInitContext: Schema.Struct({
    settings: Settings,
    path: Schema.String,
    id: Schema.String,
    occurrence: Schema.Literals(['desktop', 'mobile']),
  }),
  Model: Schema.Struct({
    scroll: ScrollAreaBlock.Model,
    path: Schema.String,
    id: Schema.String,
    occurrence: Schema.Literals(['desktop', 'mobile']),
    isMac: Schema.Boolean,
    search: NavMenuBlock.Model,
    pages: NavMenuBlock.Model,
    system: NavMenuBlock.Model,
    fluid: NavMenuBlock.Model,
    charts: NavMenuBlock.Model,
  }),
  Message,
  InMessage,
  OutMessage,
  effects: Block.makeEffectsContract<never, SiteEnvironment>(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: Pick<Settings, 'shape' | 'size' | 'hover'>
    }>(),
  },
})
const CapturePlatform = NavigationBlock.makeCommand('CapturePlatform', {
  messages: [Message.CompletedCapturePlatform],
  *handler() {
    const env = yield* SiteEnvironment
    return () => Effect.succeed(Message.CompletedCapturePlatform({ mac: env.isMac }))
  },
})
const Search = NavigationBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'search',
  init: {
    contextToArgs: ({ id, settings }) => [
      {
        id: `${id}-search`,
        items: navItems([{ href: '#search', name: 'Search' }]),
        ariaLabel: 'Search',
        hoverMode: settings.hover,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: NavigationBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: () => NavigationBlock.makeOutMessageStep(() => OutMessage.RequestedSearch()),
  }),
})
const Pages = NavigationBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'pages',
  init: {
    contextToArgs: ({ path, id, settings }) => [
      {
        id: `${id}-pages`,
        items: navItems(guidePages),
        activeSlug: path,
        ariaLabel: 'Guides',
        hoverMode: settings.hover,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: NavigationBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: NavigationBlock.makeNoopStep,
  }),
})
const System = NavigationBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'system',
  init: {
    contextToArgs: ({ path, id, settings }) => [
      {
        id: `${id}-system`,
        items: navItems(systemPages),
        activeSlug: path,
        ariaLabel: 'System',
        hoverMode: settings.hover,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: NavigationBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: NavigationBlock.makeNoopStep,
  }),
})
const Fluid = NavigationBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'fluid',
  init: {
    contextToArgs: ({ path, id, settings }) => [
      {
        id: `${id}-fluid`,
        items: navItems(fluidPages.toSorted((a, b) => a.name.localeCompare(b.name))),
        activeSlug: path,
        ariaLabel: 'Fluid components',
        hoverMode: settings.hover,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: NavigationBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: NavigationBlock.makeNoopStep,
  }),
})
const Charts = NavigationBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'charts',
  init: {
    contextToArgs: ({ path, id, settings }) => [
      {
        id: `${id}-charts`,
        items: navItems(chartPages),
        activeSlug: path,
        ariaLabel: 'Bklit charts',
        hoverMode: settings.hover,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: NavigationBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: NavigationBlock.makeNoopStep,
  }),
})
const Scroll = NavigationBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: { contextToArgs: ({ id }) => [{ id: `${id}-scroll` }] },
}).withOutMessagePolicy({
  fold: NavigationBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: NavigationBlock.makeNoopStep,
  }),
})
const NavigationComposition = NavigationBlock.makeComposition({
  bindings: [Search, Pages, System, Fluid, Charts, Scroll],
})
const plans = {
  init: NavigationComposition.makeInit((settings, path, id, occurrence) => ({
    model: { path, id, occurrence, isMac: false },
    commands: [CapturePlatform()],
    childInitContext: { settings, path, id, occurrence },
  })),
  EffectsLayer: CapturePlatform.layer,
  update: NavigationComposition.makeUpdate({
    CompletedCapturePlatform: NavigationBlock.makeFieldsStep.fromMessage(({ mac }) => ({
      isMac: () => mac,
    })),
  }),
  inMessageUpdate: NavigationComposition.makeInMessageUpdate({
    InformedOfPage: NavigationBlock.makeStep((model, { path }) =>
      path === model.path
        ? NavigationBlock.makeNoopStep()
        : Update.combineSteps([
            NavigationBlock.makeFieldsStep(() => ({ path: () => path })),
            Pages.requestConfigure({ items: navItems(guidePages), activeSlug: path }),
            System.requestConfigure({ items: navItems(systemPages), activeSlug: path }),
            Fluid.requestConfigure({
              items: navItems(fluidPages.toSorted((a, b) => a.name.localeCompare(b.name))),
              activeSlug: path,
            }),
            Charts.requestConfigure({ items: navItems(chartPages), activeSlug: path }),
          ]),
    ),
    InformedOfHoverMode: NavigationBlock.makeStep((model, { mode }) =>
      Update.combineSteps([
        ...(hoverModeOf(model.search) === mode ? [] : [Search.requestHoverMode({ mode })]),
        ...(hoverModeOf(model.pages) === mode ? [] : [Pages.requestHoverMode({ mode })]),
        ...(hoverModeOf(model.system) === mode ? [] : [System.requestHoverMode({ mode })]),
        ...(hoverModeOf(model.fluid) === mode ? [] : [Fluid.requestHoverMode({ mode })]),
        ...(hoverModeOf(model.charts) === mode ? [] : [Charts.requestHoverMode({ mode })]),
      ]),
    ),
  }),
  view: NavigationComposition.makeView.withInputs<{
    readonly settings: Pick<Settings, 'shape' | 'size' | 'hover'>
  }>((model, { settings }, h) => {
    const context = presentation(settings)
    const { icons, size } = resolvePresentation({ context })
    const inputs = {
      context,
      animate: motion.node,
      highlight,
      sidebar: true,
      kind: 'link' as const,
    }
    return SidebarContent(
      {
        context,
        className: 'py-2',
        viewportClassName: 'scroll-fade [&>div]:!block [&>div]:!min-w-0',
        ...(model.occurrence === 'desktop'
          ? {
              occurrence: 'desktop' as const,
              scroll: (viewInputs: ScrollAreaProps) =>
                h.block(Scroll.embedView({ slotId: 'scroll', model: model.scroll, viewInputs })),
            }
          : { occurrence: 'mobile' as const }),
        content: () => [
          SidebarHeader(
            {
              className: '',
              children: [
                h.block(
                  Search.embedView({
                    slotId: 'search',
                    model: model.search,
                    viewInputs: {
                      ...inputs,
                      kind: 'action',
                      icon: (_item, active) =>
                        icons.search(
                          {
                            size: size.icon,
                            strokeWidth: active ? 2 : 1.5,
                            className: `shrink-0 transition-[color,stroke-width] duration-80 ${active ? 'text-foreground' : 'text-muted-foreground'}`,
                          },
                          h,
                        ),
                      rowBadge: (_item, active) => [
                        SidebarMenuBadge(
                          {
                            context,
                            active,
                            className:
                              'mt-px gap-0.5 px-0 font-mono text-site-micro leading-none [@media(hover:none)]:hidden',
                            children: (model.isMac ? ['⌘', 'K'] : ['Ctrl', 'K']).map((key) =>
                              h.kbd(
                                [
                                  h.Class(
                                    // oxlint-disable-next-line shadcn/no-arbitrary-values -- Original app/components/site-command-menu.tsx:190 at cc276ca0 owns this exact keycap surface.
                                    'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[2px] bg-[light-dark(rgb(23_23_23/0.08),rgb(245_245_245/0.08))] px-1 font-[inherit]',
                                  ),
                                ],
                                [key],
                              ),
                            ),
                          },
                          h,
                        ),
                      ],
                    },
                  }),
                ),
              ],
            },
            h,
          ),
          SidebarGroup(
            {
              children: [
                h.block(
                  Pages.embedView({
                    slotId: 'navigation-pages',
                    model: model.pages,
                    viewInputs: inputs,
                  }),
                ),
              ],
            },
            h,
          ),
          h.div(
            [h.Class('relative flex w-full min-w-0 flex-col p-2 pt-4')],
            [
              SidebarGroupLabel(
                {
                  context,
                  className: 'text-foreground',
                  children: [
                    'System',
                    h.span(
                      [
                        h.Class(
                          'ml-auto flex h-5 min-w-5 items-center justify-center px-1 font-sans text-site-caption tabular-nums text-muted-foreground',
                        ),
                      ],
                      [String(systemPages.length)],
                    ),
                  ],
                },
                h,
              ),
              h.div([h.AriaHidden(true), h.Class('mb-1 ml-2 mr-3 h-px shrink-0 bg-border')]),
              h.block(
                System.embedView({
                  slotId: 'navigation-system',
                  model: model.system,
                  viewInputs: inputs,
                }),
              ),
            ],
          ),
          h.div(
            [h.Class('relative flex w-full min-w-0 flex-col p-2 pt-4')],
            [
              SidebarGroupLabel(
                {
                  context,
                  className: 'text-foreground',
                  children: [
                    'Fluid',
                    h.span(
                      [
                        h.Class(
                          'ml-auto flex h-5 min-w-5 items-center justify-center px-1 font-sans text-site-caption tabular-nums text-muted-foreground',
                        ),
                      ],
                      [String(fluidPages.length)],
                    ),
                  ],
                },
                h,
              ),
              h.div([h.AriaHidden(true), h.Class('mb-1 ml-2 mr-3 h-px shrink-0 bg-border')]),
              h.block(
                Fluid.embedView({
                  slotId: 'navigation-fluid',
                  model: model.fluid,
                  viewInputs: inputs,
                }),
              ),
            ],
          ),
          h.div(
            [h.Class('relative flex w-full min-w-0 flex-col p-2 pt-4')],
            [
              SidebarGroupLabel(
                {
                  context,
                  className: 'text-foreground',
                  children: [
                    'Bklit charts',
                    h.span(
                      [
                        h.Class(
                          'ml-auto flex h-5 min-w-5 items-center justify-center px-1 font-sans text-site-caption tabular-nums text-muted-foreground',
                        ),
                      ],
                      [String(chartPages.length)],
                    ),
                  ],
                },
                h,
              ),
              h.div([h.AriaHidden(true), h.Class('mb-1 ml-2 mr-3 h-px shrink-0 bg-border')]),
              h.block(
                Charts.embedView({
                  slotId: 'navigation-charts',
                  model: model.charts,
                  viewInputs: inputs,
                }),
              ),
            ],
          ),
          h.p(
            [h.Class('pt-6 pr-2.5 pb-6 pl-2.5 text-[11px] text-muted-foreground leading-[1.8] ')],
            ['Built with Foldkit. Designed by Micka & Bklit.'],
          ),
        ],
      },
      h,
    )
  }),
}
export const layer = NavigationBlock.makeLayer<typeof plans>(plans).pipe(
  Layer.provide(Layer.mergeAll(navMenuLayer, ScrollLayer)),
)
