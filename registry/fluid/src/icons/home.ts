// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Home: Icon = (options, h) =>
  renderLucideIcon('house', options, h, [
    h.path([h.D('M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8')]),
    h.path([
      h.D(
        'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      ),
    ]),
  ])
