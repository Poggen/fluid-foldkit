// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const Loader: Icon = (options, h) =>
  renderLucideIcon('loader', options, h, [
    h.path([h.D('M12 2v4')]),
    h.path([h.D('m16.2 7.8 2.9-2.9')]),
    h.path([h.D('M18 12h4')]),
    h.path([h.D('m16.2 16.2 2.9 2.9')]),
    h.path([h.D('M12 18v4')]),
    h.path([h.D('m4.9 19.1 2.9-2.9')]),
    h.path([h.D('M2 12h4')]),
    h.path([h.D('m4.9 4.9 2.9 2.9')]),
  ])
