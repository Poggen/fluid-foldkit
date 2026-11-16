import type { HoverMode } from './hover-observation.js'
import { Schema } from 'effect'

export const NavItemConfig = Schema.Struct({
  value: Schema.String,
  label: Schema.String,
  href: Schema.String,
  disabled: Schema.Boolean,
  status: Schema.NullOr(Schema.Literals(['active', 'unread', 'idle', 'new', 'updated'])),
  badge: Schema.NullOr(Schema.String),
  level: Schema.Natural,
})
export type NavItemConfig = typeof NavItemConfig.Type

export interface NavMenuConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly items: ReadonlyArray<NavItemConfig>
  readonly activeSlug?: string | null
  readonly ariaLabel?: string
}
