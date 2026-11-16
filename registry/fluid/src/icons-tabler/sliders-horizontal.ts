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
      h.Attribute(
        'class',
        `tabler-icon tabler-icon-adjustments-horizontal ${options.className ?? ''}`,
      ),
    ],
    [
      h.path([h.Attribute('d', 'M12 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0')]),
      h.path([h.Attribute('d', 'M4 6l8 0')]),
      h.path([h.Attribute('d', 'M16 6l4 0')]),
      h.path([h.Attribute('d', 'M6 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0')]),
      h.path([h.Attribute('d', 'M4 12l2 0')]),
      h.path([h.Attribute('d', 'M10 12l10 0')]),
      h.path([h.Attribute('d', 'M15 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0')]),
      h.path([h.Attribute('d', 'M4 18l11 0')]),
      h.path([h.Attribute('d', 'M19 18l1 0')]),
    ],
  )
