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
      h.Attribute('class', `tabler-icon tabler-icon-palette ${options.className ?? ''}`),
    ],
    [
      h.path([
        h.Attribute(
          'd',
          'M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25',
        ),
      ]),
      h.path([h.Attribute('d', 'M7.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0')]),
      h.path([h.Attribute('d', 'M11.5 7.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0')]),
      h.path([h.Attribute('d', 'M15.5 10.5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0')]),
    ],
  )
