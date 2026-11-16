// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Pause: Icon = (options, h) =>
  renderLucideIcon('pause', options, h, [
    h.rect([h.X('14'), h.Y('3'), h.Width('5'), h.Height('18'), h.Rx('1')]),
    h.rect([h.X('5'), h.Y('3'), h.Width('5'), h.Height('18'), h.Rx('1')]),
  ])
