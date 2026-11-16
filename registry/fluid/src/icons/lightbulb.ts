// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Lightbulb: Icon = (options, h) =>
  renderLucideIcon('lightbulb', options, h, [
    h.path([
      h.D(
        'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5',
      ),
    ]),
    h.path([h.D('M9 18h6')]),
    h.path([h.D('M10 22h4')]),
  ])
