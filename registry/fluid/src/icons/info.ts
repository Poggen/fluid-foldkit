/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Info: Icon = (options, h) =>
  renderLucideIcon('info', options, h, [
    h.circle([h.Cx('12'), h.Cy('12'), h.R('10')]),
    h.path([h.D('M12 16v-4')]),
    h.path([h.D('M12 8h.01')]),
  ])
