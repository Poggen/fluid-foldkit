// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Brain: Icon = (options, h) =>
  renderLucideIcon('brain', options, h, [
    h.path([h.D('M12 18V5')]),
    h.path([h.D('M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4')]),
    h.path([h.D('M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5')]),
    h.path([h.D('M17.997 5.125a4 4 0 0 1 2.526 5.77')]),
    h.path([h.D('M18 18a4 4 0 0 0 2-7.464')]),
    h.path([h.D('M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517')]),
    h.path([h.D('M6 18a4 4 0 0 1-2-7.464')]),
    h.path([h.D('M6.003 5.125a4 4 0 0 0-2.526 5.77')]),
  ])
