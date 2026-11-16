// Exact @tabler/icons-react 3.41.1 SVG. MIT; see NOTICE
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
      h.Attribute('class', `tabler-icon tabler-icon-bulb ${options.className ?? ''}`),
    ],
    [
      h.path([h.Attribute('d', 'M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7')]),
      h.path([
        h.Attribute(
          'd',
          'M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3',
        ),
      ]),
      h.path([h.Attribute('d', 'M9.7 17l4.6 0')]),
    ],
  )
