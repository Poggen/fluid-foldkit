/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const ChevronsUpDown: Icon = (options, h) =>
  renderLucideIcon('chevrons-up-down', options, h, [
    h.path([h.D('m7 15 5 5 5-5')]),
    h.path([h.D('m7 9 5-5 5 5')]),
  ])
