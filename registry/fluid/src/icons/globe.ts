// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Globe: Icon = (options, h) =>
  renderLucideIcon('globe', options, h, [
    h.circle([h.Cx('12'), h.Cy('12'), h.R('10')]),
    h.path([h.D('M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20')]),
    h.path([h.D('M2 12h20')]),
  ])
