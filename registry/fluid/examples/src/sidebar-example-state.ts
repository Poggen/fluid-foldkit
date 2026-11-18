import { ScrollAreaBlock } from '@foldkit-visuals/fluid/scroll-area'
import { DocumentTooltipBlock, makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import { modifyFields } from 'foldkit/struct'
import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import { DialogResourcesLayer } from '@foldkit-visuals/fluid/dialog'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { SidebarBlock } from '@foldkit-visuals/fluid/sidebar'
import type { SidebarConfig } from '@foldkit-visuals/fluid/sidebar'

import type { NavItemConfig } from '@foldkit-visuals/fluid/nav-menu'
import { NavMenuBlock } from '@foldkit-visuals/fluid/nav-menu'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'

import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'

export const sourcePreset = new URLSearchParams(location.search).get('preset') === 'source'

export const presentation = createPresentationContext({
  reducedMotion: 'user',
  ...examplePresentation,
})

const demoPages: ReadonlyArray<NavItemConfig> = [
  {
    value: 'overview',
    label: 'Overview',
    href: '#overview',
    badge: null,
    status: null,
    level: 0,
    disabled: false,
  },
  {
    value: 'inbox',
    label: 'Inbox',
    href: '#inbox',
    badge: '12',
    status: 'unread',
    level: 0,
    disabled: false,
  },
  {
    value: 'projects',
    label: 'Projects',
    href: '#projects',
    badge: null,
    status: null,
    level: 0,
    disabled: false,
  },
  {
    value: 'design',
    label: 'Design system',
    href: '#design',
    badge: null,
    status: 'updated',
    level: 1,
    disabled: false,
  },
  {
    value: 'archive',
    label: 'Archive',
    href: '#archive',
    badge: null,
    status: 'idle',
    level: 0,
    disabled: false,
  },
  {
    value: 'locked',
    label: 'Private workspace',
    href: '#private',
    badge: null,
    status: null,
    level: 0,
    disabled: true,
  },
]

const pages: ReadonlyArray<NavItemConfig> = sourcePreset
  ? demoPages.slice(0, 3).map((item) => ({ ...item, badge: null, status: null }))
  : demoPages

const initialHref = window.location.hash || '#overview'

export const motion = createMotionScope('sidebar-showcase')

export const services = Layer.mergeAll(
  DialogResourcesLayer(document),
  makeTooltipDomLayer(document, window),
)

const effects = Block.makeEffectsContract<never, Layer.Success<typeof services>>()

const Model = Schema.Struct({
  sidebar: SidebarBlock.Model,
  scroll: ScrollAreaBlock.Model,
  tooltips: DocumentTooltipBlock.Model,
  menu: NavMenuBlock.Model,
  mobileMenu: NavMenuBlock.Model,
  nav: NavMenuBlock.Model,
  page: Schema.String,
  isGroupOpen: Schema.Boolean,
})

export const Message = defineMessageUnion({
  ToggledGroup: { open: Schema.Boolean },
  ClickedClearRoute: {},
})

export const SidebarShowcaseKey = Symbol('FluidSidebarShowcase')

export const FluidSidebarShowcaseBlock = Block.make('FluidSidebarShowcase', {
  key: SidebarShowcaseKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Document' },
})

export const Sidebar = FluidSidebarShowcaseBlock.makeRequiredFieldBinding(SidebarBlock, {
  field: 'sidebar',
  init: {
    contextToArgs: () =>
      [
        { id: 'showcase-sidebar', peek: 'hover', variant: 'inset', persist: !sourcePreset },
      ] satisfies [SidebarConfig],
  },
}).withOutMessagePolicy({
  fold: FluidSidebarShowcaseBlock.makeOutMessageFold(SidebarBlock, {
    OpenChanged: () => FluidSidebarShowcaseBlock.makeNoopStep(),
    WidthChanged: () => FluidSidebarShowcaseBlock.makeNoopStep(),
  }),
})

const RawMenu = FluidSidebarShowcaseBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'menu',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'workspace-menu',
        items: pages,
        activeSlug: initialHref,
        ariaLabel: 'Workspace',
      },
    ],
  },
})

const RawMobileMenu = FluidSidebarShowcaseBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'mobileMenu',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'workspace-menu-mobile',
        items: pages,
        activeSlug: initialHref,
        ariaLabel: 'Workspace',
      },
    ],
  },
})

const selectedMenu = ({ value, href }: { readonly value: string; readonly href: string }) =>
  Update.combineSteps([
    FluidSidebarShowcaseBlock.makeFieldsStep(() => ({ page: () => value })),
    RawMenu.requestConfigure({ items: pages, activeSlug: href }),
    RawMobileMenu.requestConfigure({ items: pages, activeSlug: href }),
  ])

export const Menu = RawMenu.withOutMessagePolicy({
  fold: FluidSidebarShowcaseBlock.makeOutMessageFold(NavMenuBlock, { Selected: selectedMenu }),
})

export const MobileMenu = RawMobileMenu.withOutMessagePolicy({
  fold: FluidSidebarShowcaseBlock.makeOutMessageFold(NavMenuBlock, { Selected: selectedMenu }),
})

const RawNav = FluidSidebarShowcaseBlock.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'nav',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'documentation-menu',
        items: pages.slice(0, 3),
        activeSlug: initialHref,
        ariaLabel: 'Documentation',
      },
    ],
  },
})

export const Nav = RawNav.withOutMessagePolicy({
  fold: FluidSidebarShowcaseBlock.makeOutMessageFold(NavMenuBlock, {
    Selected: ({ href }) => RawNav.requestConfigure({ items: pages.slice(0, 3), activeSlug: href }),
  }),
})

export const Scroll = FluidSidebarShowcaseBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: { contextToArgs: () => [{ id: 'showcase-sidebar-scroll' }] },
}).withOutMessagePolicy({
  fold: FluidSidebarShowcaseBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: FluidSidebarShowcaseBlock.makeNoopStep,
  }),
})
export const Tooltips = FluidSidebarShowcaseBlock.makeRequiredFieldBinding(DocumentTooltipBlock, {
  field: 'tooltips',
  init: { contextToArgs: () => [] },
}).withOutMessagePolicy({
  fold: FluidSidebarShowcaseBlock.makeOutMessageFold(DocumentTooltipBlock, {
    Transaction: FluidSidebarShowcaseBlock.makeNoopStep,
  }),
})

export const FluidSidebarShowcaseComposition = FluidSidebarShowcaseBlock.makeComposition({
  bindings: [Sidebar, Menu, MobileMenu, Nav, Scroll, Tooltips],
})

export const init = FluidSidebarShowcaseComposition.makeInit(() => ({
  model: { page: initialHref.slice(1), isGroupOpen: true },
  steps: [
    Tooltips.requestAdd({ key: 'showcase-sidebar-inset-trigger', options: { side: 'bottom' } }),
  ],
}))

export const update = FluidSidebarShowcaseComposition.makeUpdate({
  ClickedClearRoute: Update.combineSteps([
    RawMenu.requestConfigure({ items: pages, activeSlug: null }),
    RawMobileMenu.requestConfigure({ items: pages, activeSlug: null }),
  ]),
  ToggledGroup: (model, { open }) => ({ model: modifyFields(model, { isGroupOpen: () => open }) }),
})
