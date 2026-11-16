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
      h.circle([
        h.Attribute('cx', '12'),
        h.Attribute('cy', '12'),
        h.Attribute('r', '10'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-linejoin', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
      h.path([
        h.Attribute('d', 'M12 8V12'),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-linejoin', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
      h.path([
        h.Attribute(
          'd',
          'M12.125 15.75H12M12.25 15.75C12.25 15.8881 12.1381 16 12 16C11.8619 16 11.75 15.8881 11.75 15.75C11.75 15.6119 11.8619 15.5 12 15.5C12.1381 15.5 12.25 15.6119 12.25 15.75Z',
        ),
        h.Attribute('stroke', 'currentColor'),
        h.Attribute('stroke-linecap', 'round'),
        h.Attribute('stroke-linejoin', 'round'),
        h.Attribute('stroke-width', String(options.strokeWidth ?? '1.5')),
      ]),
    ],
  )
