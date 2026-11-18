/* @license Exact @tabler/icons-react 3.41.1 SVG. MIT; see NOTICE */
import type { Icon } from '../presentation.js'

export const icon: Icon = (options, h) =>
  h.svg(
    [
      h.Attribute('xmlns', 'http://www.w3.org/2000/svg'),
      h.Attribute('width', String(options.size ?? '24')),
      h.Attribute('height', String(options.size ?? '24')),
      h.Attribute('viewBox', '0 0 24 24'),
      h.Attribute('fill', 'none'),
      h.Attribute('stroke', 'currentColor'),
      h.Attribute('stroke-width', String(options.strokeWidth ?? '2')),
      h.Attribute('stroke-linecap', 'round'),
      h.Attribute('stroke-linejoin', 'round'),
      h.Attribute('class', `tabler-icon tabler-icon-rotate-2 ${options.className ?? ''}`),
    ],
    [
      h.path([h.Attribute('d', 'M15 4.55a8 8 0 0 0 -6 14.9m0 -4.45v5h-5')]),
      h.path([h.Attribute('d', 'M18.37 7.16l0 .01')]),
      h.path([h.Attribute('d', 'M13 19.94l0 .01')]),
      h.path([h.Attribute('d', 'M16.84 18.37l0 .01')]),
      h.path([h.Attribute('d', 'M19.37 15.1l0 .01')]),
      h.path([h.Attribute('d', 'M19.94 11l0 .01')]),
    ],
  )
