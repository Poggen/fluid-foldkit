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
      h.Attribute('class', `tabler-icon tabler-icon-file ${options.className ?? ''}`),
    ],
    [
      h.path([h.Attribute('d', 'M14 3v4a1 1 0 0 0 1 1h4')]),
      h.path([
        h.Attribute('d', 'M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2'),
      ]),
    ],
  )
