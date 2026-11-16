// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const CornerDownLeft: Icon = (options, h) =>
  renderLucideIcon('corner-down-left', options, h, [
    h.path([h.D('M20 4v7a4 4 0 0 1-4 4H4')]),
    h.path([h.D('m9 10-5 5 5 5')]),
  ])
