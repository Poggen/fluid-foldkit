/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Palette: Icon = (options, h) =>
  renderLucideIcon('palette', options, h, [
    h.path([
      h.D(
        'M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z',
      ),
    ]),
    h.circle([h.Cx('13.5'), h.Cy('6.5'), h.R('.5'), h.Fill('currentColor')]),
    h.circle([h.Cx('17.5'), h.Cy('10.5'), h.R('.5'), h.Fill('currentColor')]),
    h.circle([h.Cx('6.5'), h.Cy('12.5'), h.R('.5'), h.Fill('currentColor')]),
    h.circle([h.Cx('8.5'), h.Cy('7.5'), h.R('.5'), h.Fill('currentColor')]),
  ])
