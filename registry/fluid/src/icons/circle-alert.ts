// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const CircleAlert: Icon = (options, h) =>
  renderLucideIcon('circle-alert', options, h, [
    h.circle([h.Cx('12'), h.Cy('12'), h.R('10')]),
    h.line([h.X1('12'), h.X2('12'), h.Y1('8'), h.Y2('12')]),
    h.line([h.X1('12'), h.X2('12.01'), h.Y1('16'), h.Y2('16')]),
  ])
