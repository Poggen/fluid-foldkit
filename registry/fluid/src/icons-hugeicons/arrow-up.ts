// Exact @hugeicons/react 1.1.6 SVG. MIT; see NOTICE
import type { Icon } from '../presentation.js'

export const icon: Icon = (options, h) =>
  h.svg(
    [
      h.Attribute('xmlns', 'http://www.w3.org/2000/svg'),
      h.Attribute('width', String(options.size ?? '24')),
      h.Attribute('height', String(options.size ?? '24')),
      h.Attribute('viewBox', '0 0 24 24'),
      h.Attribute('fill', 'none'),
      h.Attribute('color', 'currentColor'),
      h.Attribute('class', options.className ?? ''),
      ...(options.strokeWidth === undefined
        ? []
        : [h.Attribute('stroke-width', String(options.strokeWidth))]),
      ...(options.strokeWidth === undefined ? [] : [h.Attribute('stroke', 'currentColor')]),
    ],
    [
      h.path([
        h.Attribute(
          'd',
          'M17.9998 15C17.9998 15 13.5809 9.00001 11.9998 9C10.4187 8.99999 5.99985 15 5.99985 15',
        ),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-linejoin', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
    ],
  )
