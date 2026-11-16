// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Monitor: Icon = (options, h) =>
  renderLucideIcon('monitor', options, h, [
    h.rect([h.Width('20'), h.Height('14'), h.X('2'), h.Y('3'), h.Rx('2')]),
    h.line([h.X1('8'), h.X2('16'), h.Y1('21'), h.Y2('21')]),
    h.line([h.X1('12'), h.X2('12'), h.Y1('17'), h.Y2('21')]),
  ])
