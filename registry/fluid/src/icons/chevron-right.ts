// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const ChevronRight: Icon = (options, h) =>
  renderLucideIcon('chevron-right', options, h, [h.path([h.D('m9 18 6-6-6-6')])])
