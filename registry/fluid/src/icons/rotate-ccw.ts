// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const RotateCcw: Icon = (options, h) =>
  renderLucideIcon('rotate-ccw', options, h, [
    h.path([h.D('M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8')]),
    h.path([h.D('M3 3v5h5')]),
  ])
