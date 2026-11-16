// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const ImageIcon: Icon = (options, h) =>
  renderLucideIcon('image', options, h, [
    h.rect([h.Width('18'), h.Height('18'), h.X('3'), h.Y('3'), h.Rx('2'), h.Ry('2')]),
    h.circle([h.Cx('9'), h.Cy('9'), h.R('2')]),
    h.path([h.D('m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21')]),
  ])
