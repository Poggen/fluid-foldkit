// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Minus: Icon = (options, h) =>
  renderLucideIcon('minus', options, h, [h.path([h.D('M5 12h14')])])
