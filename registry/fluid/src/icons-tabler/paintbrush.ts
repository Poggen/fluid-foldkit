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
      h.Attribute('class', `tabler-icon tabler-icon-brush ${options.className ?? ''}`),
    ],
    [
      h.path([h.Attribute('d', 'M3 21v-4a4 4 0 1 1 4 4h-4')]),
      h.path([h.Attribute('d', 'M21 3a16 16 0 0 0 -12.8 10.2')]),
      h.path([h.Attribute('d', 'M21 3a16 16 0 0 1 -10.2 12.8')]),
      h.path([h.Attribute('d', 'M10.6 9a9 9 0 0 1 4.4 4.4')]),
    ],
  )
