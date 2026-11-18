/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Sun: Icon = (options, h) =>
  renderLucideIcon('sun', options, h, [
    h.circle([h.Cx('12'), h.Cy('12'), h.R('4')]),
    h.path([h.D('M12 2v2')]),
    h.path([h.D('M12 20v2')]),
    h.path([h.D('m4.93 4.93 1.41 1.41')]),
    h.path([h.D('m17.66 17.66 1.41 1.41')]),
    h.path([h.D('M2 12h2')]),
    h.path([h.D('M20 12h2')]),
    h.path([h.D('m6.34 17.66-1.41 1.41')]),
    h.path([h.D('m19.07 4.93-1.41 1.41')]),
  ])
