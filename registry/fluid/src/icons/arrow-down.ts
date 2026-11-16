// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const ArrowDown: Icon = (options, h) =>
  renderLucideIcon('arrow-down', options, h, [
    h.path([h.D('M12 5v14')]),
    h.path([h.D('m19 12-7 7-7-7')]),
  ])
