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
      h.Attribute('class', `tabler-icon tabler-icon-link ${options.className ?? ''}`),
    ],
    [
      h.path([h.Attribute('d', 'M9 15l6 -6')]),
      h.path([h.Attribute('d', 'M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464')]),
      h.path([
        h.Attribute(
          'd',
          'M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463',
        ),
      ]),
    ],
  )
