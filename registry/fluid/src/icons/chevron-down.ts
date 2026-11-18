/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const ChevronDown: Icon = (options, h) =>
  renderLucideIcon('chevron-down', options, h, [h.path([h.D('m6 9 6 6 6-6')])])
