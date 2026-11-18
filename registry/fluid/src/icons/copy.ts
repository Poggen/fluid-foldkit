/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Copy: Icon = (options, h) =>
  renderLucideIcon('copy', options, h, [
    h.rect([h.Width('14'), h.Height('14'), h.X('8'), h.Y('8'), h.Rx('2'), h.Ry('2')]),
    h.path([h.D('M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2')]),
  ])
