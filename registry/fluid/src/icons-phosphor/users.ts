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
              'M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z',
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
              'M112.6,158.43a58,58,0,1,0-57.2,0A93.83,93.83,0,0,0,5.21,196.72a6,6,0,0,0,10.05,6.56,82,82,0,0,1,137.48,0,6,6,0,0,0,10-6.56A93.83,93.83,0,0,0,112.6,158.43ZM38,108a46,46,0,1,1,46,46A46.06,46.06,0,0,1,38,108Zm211,97a6,6,0,0,1-8.3-1.74A81.8,81.8,0,0,0,172,166a6,6,0,0,1,0-12,46,46,0,1,0-17.08-88.73,6,6,0,1,1-4.46-11.14,58,58,0,0,1,50.14,104.3,93.83,93.83,0,0,1,50.19,38.29A6,6,0,0,1,249,205Z',
            ),
          ]),
        ],
      )
