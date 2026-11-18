/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Search: Icon = (options, h) =>
  renderLucideIcon('search', options, h, [
    h.path([h.D('m21 21-4.34-4.34')]),
    h.circle([h.Cx('11'), h.Cy('11'), h.R('8')]),
  ])
