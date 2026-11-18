/* @license SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT). */
/* @license See NOTICE */
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const PanelLeft: Icon = (options, h) =>
  renderLucideIcon('panel-left', options, h, [
    h.rect([h.Width('18'), h.Height('18'), h.X('3'), h.Y('3'), h.Rx('2')]),
    h.path([h.D('M9 3v18')]),
  ])
