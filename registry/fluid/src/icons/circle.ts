// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Circle: Icon = (options, h) =>
  renderLucideIcon('circle', options, h, [h.circle([h.Cx('12'), h.Cy('12'), h.R('10')])])
