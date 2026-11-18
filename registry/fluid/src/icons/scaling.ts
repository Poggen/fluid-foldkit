/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Scaling: Icon = (options, h) =>
  renderLucideIcon('scaling', options, h, [
    h.path([h.D('M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7')]),
    h.path([h.D('M14 15H9v-5')]),
    h.path([h.D('M16 3h5v5')]),
    h.path([h.D('M21 3 9 15')]),
  ])
