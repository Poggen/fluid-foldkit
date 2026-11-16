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
      h.Attribute('class', `tabler-icon tabler-icon-globe ${options.className ?? ''}`),
    ],
    [
      h.path([h.Attribute('d', 'M7 9a4 4 0 1 0 8 0a4 4 0 0 0 -8 0')]),
      h.path([h.Attribute('d', 'M5.75 15a8.015 8.015 0 1 0 9.25 -13')]),
      h.path([h.Attribute('d', 'M11 17v4')]),
      h.path([h.Attribute('d', 'M7 21h8')]),
    ],
  )
