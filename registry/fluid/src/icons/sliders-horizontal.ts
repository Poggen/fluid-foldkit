// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const SlidersHorizontal: Icon = (options, h) =>
  renderLucideIcon('sliders-horizontal', options, h, [
    h.path([h.D('M10 5H3')]),
    h.path([h.D('M12 19H3')]),
    h.path([h.D('M14 3v4')]),
    h.path([h.D('M16 17v4')]),
    h.path([h.D('M21 12h-9')]),
    h.path([h.D('M21 19h-5')]),
    h.path([h.D('M21 5h-7')]),
    h.path([h.D('M8 10v4')]),
    h.path([h.D('M8 12H3')]),
  ])
