/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Dot: Icon = (options, h) =>
  renderLucideIcon('dot', options, h, [h.circle([h.Cx('12.1'), h.Cy('12.1'), h.R('1')])])
