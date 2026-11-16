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
      h.Attribute('class', `tabler-icon tabler-icon-photo ${options.className ?? ''}`),
    ],
    [
      h.path([h.Attribute('d', 'M15 8h.01')]),
      h.path([
        h.Attribute(
          'd',
          'M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12',
        ),
      ]),
      h.path([h.Attribute('d', 'M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5')]),
      h.path([h.Attribute('d', 'M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3')]),
    ],
  )
