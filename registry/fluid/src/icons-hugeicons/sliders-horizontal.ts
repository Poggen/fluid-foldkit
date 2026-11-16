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
        h.Attribute('d', 'M3.99963 5.00055L9.99963 5.00031'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
      h.path([
        h.Attribute('d', 'M12.9996 5.00031L19.9996 5.00031'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
      h.path([
        h.Attribute('d', 'M15.9996 9.00031L15.9996 15.0003'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
      h.path([
        h.Attribute('d', 'M9.99963 2.00031L9.99963 8.00031'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
      h.path([
        h.Attribute('d', 'M11.9996 16.0003L11.9996 22.0003'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
      h.path([
        h.Attribute('d', 'M15.9996 12.0001L19.9996 12.0003'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
      h.path([
        h.Attribute('d', 'M3.99963 12.0005L12.9996 12.0003'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
      h.path([
        h.Attribute('d', 'M11.9996 19.0003L19.9996 19.0003'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
      h.path([
        h.Attribute('d', 'M3.99963 19.0005L8.99963 19.0003'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
    ],
  )
