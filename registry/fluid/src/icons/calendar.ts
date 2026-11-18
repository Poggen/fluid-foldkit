/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Calendar: Icon = (options, h) =>
  renderLucideIcon('calendar', options, h, [
    h.path([h.D('M8 2v4')]),
    h.path([h.D('M16 2v4')]),
    h.rect([h.Width('18'), h.Height('18'), h.X('3'), h.Y('4'), h.Rx('2')]),
    h.path([h.D('M3 10h18')]),
  ])
