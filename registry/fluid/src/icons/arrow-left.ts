/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const ArrowLeft: Icon = (options, h) =>
  renderLucideIcon('arrow-left', options, h, [
    h.path([h.D('m12 19-7-7 7-7')]),
    h.path([h.D('M19 12H5')]),
  ])
