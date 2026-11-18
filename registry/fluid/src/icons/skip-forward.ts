/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const SkipForward: Icon = (options, h) =>
  renderLucideIcon('skip-forward', options, h, [
    h.path([h.D('M21 4v16')]),
    h.path([
      h.D('M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z'),
    ]),
  ])
