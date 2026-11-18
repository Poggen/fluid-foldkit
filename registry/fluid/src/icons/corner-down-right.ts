/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const CornerDownRight: Icon = (options, h) =>
  renderLucideIcon('corner-down-right', options, h, [
    h.path([h.D('m15 10 5 5-5 5')]),
    h.path([h.D('M4 4v7a4 4 0 0 0 4 4h12')]),
  ])
