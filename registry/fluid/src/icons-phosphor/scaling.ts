// Exact @phosphor-icons/react 2.1.10 SVG. MIT; see NOTICE
import { Predicate } from 'effect'
import type { Icon } from '../presentation.js'

export const icon: Icon = (options, h) =>
  Predicate.isNumber(options.strokeWidth) && options.strokeWidth >= 1.75
    ? h.svg(
        [
          h.Attribute('xmlns', 'http://www.w3.org/2000/svg'),
          h.Attribute('width', String(options.size ?? '1em')),
          h.Attribute('height', String(options.size ?? '1em')),
          h.Attribute('fill', 'currentColor'),
          h.Attribute('viewBox', '0 0 256 256'),
          ...(options.className === undefined
            ? []
            : [h.Attribute('class', options.className ?? '')]),
        ],
        [
          h.path([
            h.Attribute(
              'd',
              'M136,112H48a8,8,0,0,0-8,8v88a8,8,0,0,0,8,8h88a8,8,0,0,0,8-8V120A8,8,0,0,0,136,112Zm-8,88H56V128h72Zm88-16v16a16,16,0,0,1-16,16H176a8,8,0,0,1,0-16h24V184a8,8,0,0,1,16,0Zm0-72v32a8,8,0,0,1-16,0V112a8,8,0,0,1,16,0Zm0-56V72a8,8,0,0,1-16,0V56H184a8,8,0,0,1,0-16h16A16,16,0,0,1,216,56Zm-64-8a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,48ZM40,80V56A16,16,0,0,1,56,40H72a8,8,0,0,1,0,16H56V80a8,8,0,0,1-16,0Z',
            ),
          ]),
        ],
      )
    : h.svg(
        [
          h.Attribute('xmlns', 'http://www.w3.org/2000/svg'),
          h.Attribute('width', String(options.size ?? '1em')),
          h.Attribute('height', String(options.size ?? '1em')),
          h.Attribute('fill', 'currentColor'),
          h.Attribute('viewBox', '0 0 256 256'),
          ...(options.className === undefined
            ? []
            : [h.Attribute('class', options.className ?? '')]),
        ],
        [
          h.path([
            h.Attribute(
              'd',
              'M136,114H48a6,6,0,0,0-6,6v88a6,6,0,0,0,6,6h88a6,6,0,0,0,6-6V120A6,6,0,0,0,136,114Zm-6,88H54V126h76Zm84-18v16a14,14,0,0,1-14,14H176a6,6,0,0,1,0-12h24a2,2,0,0,0,2-2V184a6,6,0,0,1,12,0Zm0-72v32a6,6,0,0,1-12,0V112a6,6,0,0,1,12,0Zm0-56V72a6,6,0,0,1-12,0V56a2,2,0,0,0-2-2H184a6,6,0,0,1,0-12h16A14,14,0,0,1,214,56Zm-64-8a6,6,0,0,1-6,6H112a6,6,0,0,1,0-12h32A6,6,0,0,1,150,48ZM42,80V56A14,14,0,0,1,56,42H72a6,6,0,0,1,0,12H56a2,2,0,0,0-2,2V80a6,6,0,0,1-12,0Z',
            ),
          ]),
        ],
      )
