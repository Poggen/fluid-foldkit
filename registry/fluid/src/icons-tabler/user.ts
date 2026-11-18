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
      h.Attribute('class', `tabler-icon tabler-icon-user ${options.className ?? ''}`),
    ],
    [
      h.path([h.Attribute('d', 'M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0')]),
      h.path([h.Attribute('d', 'M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2')]),
    ],
  )
