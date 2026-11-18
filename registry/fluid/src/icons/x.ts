/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const X: Icon = (options, h) =>
  renderLucideIcon('x', options, h, [h.path([h.D('M18 6 6 18')]), h.path([h.D('m6 6 12 12')])])
