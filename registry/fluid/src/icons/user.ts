/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const User: Icon = (options, h) =>
  renderLucideIcon('user', options, h, [
    h.path([h.D('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2')]),
    h.circle([h.Cx('12'), h.Cy('7'), h.R('4')]),
  ])
