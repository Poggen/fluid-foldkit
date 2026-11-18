import { Schema } from 'effect'

export const SIDEBAR_COOKIE_NAME = 'sidebar_state'

export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export const SIDEBAR_WIDTH = '16rem'

export const SIDEBAR_WIDTH_MOBILE = '18rem'

export const SIDEBAR_MIN_WIDTH = 160

export const SIDEBAR_MAX_WIDTH = 360

export const SIDEBAR_COLLAPSE_SLOP = 56

export const SidebarOptions = Schema.Struct({
  id: Schema.String,
  side: Schema.Literals(['left', 'right']),
  variant: Schema.Literals(['sidebar', 'floating', 'inset']),
  collapsible: Schema.Literals(['offcanvas', 'none']),
  widthMobile: Schema.String,
  mobileBreakpoint: Schema.Finite,
  persist: Schema.Boolean,
  shortcut: Schema.NullOr(Schema.String),
  peek: Schema.Literals(['hover', 'click', 'none']),
  rail: Schema.Boolean,
})

export interface SidebarConfig {
  readonly id: string
  readonly open?: boolean
  readonly defaultOpen?: boolean
  readonly side?: 'left' | 'right'
  readonly variant?: 'sidebar' | 'floating' | 'inset'
  readonly collapsible?: 'offcanvas' | 'none'
  readonly width?: string
  readonly widthMobile?: string
  readonly mobileBreakpoint?: number
  readonly persist?: boolean
  readonly shortcut?: string | null
  readonly peek?: 'hover' | 'click' | 'none'
  readonly railTooltipOpen?: boolean
  readonly rail?: boolean
}

export const SidebarConfigSchema = Schema.Struct({
  id: Schema.String,
  open: Schema.optionalKey(Schema.Boolean),
  defaultOpen: Schema.optionalKey(Schema.Boolean),
  side: Schema.optionalKey(SidebarOptions.fields.side),
  variant: Schema.optionalKey(SidebarOptions.fields.variant),
  collapsible: Schema.optionalKey(SidebarOptions.fields.collapsible),
  width: Schema.optionalKey(Schema.String),
  widthMobile: Schema.optionalKey(Schema.String),
  mobileBreakpoint: Schema.optionalKey(Schema.Finite),
  persist: Schema.optionalKey(Schema.Boolean),
  shortcut: Schema.optionalKey(Schema.NullOr(Schema.String)),
  peek: Schema.optionalKey(SidebarOptions.fields.peek),
  railTooltipOpen: Schema.optionalKey(Schema.Boolean),
  rail: Schema.optionalKey(Schema.Boolean),
})

const sidebarShortcut = (side: SidebarConfig['side']) => (side === 'right' ? ']' : '[')

export const sidebarOptions: (config: SidebarConfig) => typeof SidebarOptions.Type = (
  config: SidebarConfig,
) => ({
  id: config.id,
  side: config.side ?? 'left',
  variant: config.variant ?? 'sidebar',
  collapsible: config.collapsible ?? 'offcanvas',
  widthMobile: config.widthMobile ?? SIDEBAR_WIDTH_MOBILE,
  mobileBreakpoint: config.mobileBreakpoint ?? 768,
  persist: config.persist ?? true,
  shortcut: config.shortcut === undefined ? sidebarShortcut(config.side) : config.shortcut,
  peek: config.peek ?? 'none',
  rail: config.rail ?? true,
})
