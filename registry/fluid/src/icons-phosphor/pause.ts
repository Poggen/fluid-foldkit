/* @license Exact @phosphor-icons/react 2.1.10 SVG. MIT; see NOTICE */
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
              'M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z',
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
              'M200,34H160a14,14,0,0,0-14,14V208a14,14,0,0,0,14,14h40a14,14,0,0,0,14-14V48A14,14,0,0,0,200,34Zm2,174a2,2,0,0,1-2,2H160a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2h40a2,2,0,0,1,2,2ZM96,34H56A14,14,0,0,0,42,48V208a14,14,0,0,0,14,14H96a14,14,0,0,0,14-14V48A14,14,0,0,0,96,34Zm2,174a2,2,0,0,1-2,2H56a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2H96a2,2,0,0,1,2,2Z',
            ),
          ]),
        ],
      )
