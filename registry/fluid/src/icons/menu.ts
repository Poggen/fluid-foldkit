// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Menu: Icon = (options, h) =>
  renderLucideIcon('menu', options, h, [
    h.path([h.D('M4 5h16')]),
    h.path([h.D('M4 12h16')]),
    h.path([h.D('M4 19h16')]),
  ])
