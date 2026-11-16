// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Lock: Icon = (options, h) =>
  renderLucideIcon('lock', options, h, [
    h.rect([h.Width('18'), h.Height('11'), h.X('3'), h.Y('11'), h.Rx('2'), h.Ry('2')]),
    h.path([h.D('M7 11V7a5 5 0 0 1 10 0v4')]),
  ])
