/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Users: Icon = (options, h) =>
  renderLucideIcon('users', options, h, [
    h.path([h.D('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2')]),
    h.path([h.D('M16 3.128a4 4 0 0 1 0 7.744')]),
    h.path([h.D('M22 21v-2a4 4 0 0 0-3-3.87')]),
    h.circle([h.Cx('9'), h.Cy('7'), h.R('4')]),
  ])
