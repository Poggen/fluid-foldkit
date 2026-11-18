/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const ArrowRight: Icon = (options, h) =>
  renderLucideIcon('arrow-right', options, h, [
    h.path([h.D('M5 12h14')]),
    h.path([h.D('m12 5 7 7-7 7')]),
  ])
