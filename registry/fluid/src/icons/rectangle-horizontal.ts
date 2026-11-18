/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const RectangleHorizontal: Icon = (options, h) =>
  renderLucideIcon('rectangle-horizontal', options, h, [
    h.rect([h.Width('20'), h.Height('12'), h.X('2'), h.Y('6'), h.Rx('2')]),
  ])
