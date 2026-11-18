/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Mail: Icon = (options, h) =>
  renderLucideIcon('mail', options, h, [
    h.path([h.D('m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7')]),
    h.rect([h.X('2'), h.Y('4'), h.Width('20'), h.Height('16'), h.Rx('2')]),
  ])
