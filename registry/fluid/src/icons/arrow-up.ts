// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const ArrowUp: Icon = (options, h) =>
  renderLucideIcon('arrow-up', options, h, [
    h.path([h.D('m5 12 7-7 7 7')]),
    h.path([h.D('M12 19V5')]),
  ])
