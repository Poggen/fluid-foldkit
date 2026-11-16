// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const EllipsisVertical: Icon = (options, h) =>
  renderLucideIcon('ellipsis-vertical', options, h, [
    h.circle([h.Cx('12'), h.Cy('12'), h.R('1')]),
    h.circle([h.Cx('12'), h.Cy('5'), h.R('1')]),
    h.circle([h.Cx('12'), h.Cy('19'), h.R('1')]),
  ])
