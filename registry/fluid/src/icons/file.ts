// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from '../presentation.js'
import { renderLucideIcon } from '../icon-renderer.js'

export const File: Icon = (options, h) =>
  renderLucideIcon('file', options, h, [
    h.path([
      h.D(
        'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
      ),
    ]),
    h.path([h.D('M14 2v5a1 1 0 0 0 1 1h5')]),
  ])
