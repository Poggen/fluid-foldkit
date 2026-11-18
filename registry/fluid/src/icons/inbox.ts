/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Inbox: Icon = (options, h) =>
  renderLucideIcon('inbox', options, h, [
    h.polyline([h.Points('22 12 16 12 14 15 10 15 8 12 2 12')]),
    h.path([
      h.D(
        'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
      ),
    ]),
  ])
