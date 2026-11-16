// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const SquareLibrary: Icon = (options, h) =>
  renderLucideIcon('square-library', options, h, [
    h.rect([h.Width('18'), h.Height('18'), h.X('3'), h.Y('3'), h.Rx('2')]),
    h.path([h.D('M7 7v10')]),
    h.path([h.D('M11 7v10')]),
    h.path([h.D('m15 7 2 10')]),
  ])
