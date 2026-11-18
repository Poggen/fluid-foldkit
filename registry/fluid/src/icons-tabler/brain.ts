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
      h.Attribute('class', `tabler-icon tabler-icon-brain ${options.className ?? ''}`),
    ],
    [
      h.path([h.Attribute('d', 'M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8')]),
      h.path([h.Attribute('d', 'M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8')]),
      h.path([h.Attribute('d', 'M17.5 16a3.5 3.5 0 0 0 0 -7h-.5')]),
      h.path([h.Attribute('d', 'M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0')]),
      h.path([h.Attribute('d', 'M6.5 16a3.5 3.5 0 0 1 0 -7h.5')]),
      h.path([h.Attribute('d', 'M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10')]),
    ],
  )
