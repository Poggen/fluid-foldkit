/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Check: Icon = (options, h) =>
  renderLucideIcon('check', options, h, [h.path([h.D('M20 6 9 17l-5-5')])])
