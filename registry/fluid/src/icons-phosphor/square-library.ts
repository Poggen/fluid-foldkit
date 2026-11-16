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
              'M231.65,194.55,198.46,36.75a16,16,0,0,0-19-12.39L132.65,34.42a16.08,16.08,0,0,0-12.3,19l33.19,157.8A16,16,0,0,0,169.16,224a16.25,16.25,0,0,0,3.38-.36l46.81-10.06A16.09,16.09,0,0,0,231.65,194.55ZM136,50.15c0-.06,0-.09,0-.09l46.8-10,3.33,15.87L139.33,66Zm6.62,31.47,46.82-10.05,3.34,15.9L146,97.53Zm6.64,31.57,46.82-10.06,13.3,63.24-46.82,10.06ZM216,197.94l-46.8,10-3.33-15.87L212.67,182,216,197.85C216,197.91,216,197.94,216,197.94ZM104,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V48A16,16,0,0,0,104,32ZM56,48h48V64H56Zm0,32h48v96H56Zm48,128H56V192h48v16Z',
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
              'M104,34H56A14,14,0,0,0,42,48V208a14,14,0,0,0,14,14h48a14,14,0,0,0,14-14V48A14,14,0,0,0,104,34ZM54,78h52V178H54Zm2-32h48a2,2,0,0,1,2,2V66H54V48A2,2,0,0,1,56,46Zm48,164H56a2,2,0,0,1-2-2V190h52v18A2,2,0,0,1,104,210Zm125.7-15L196.51,37.16a14,14,0,0,0-16.63-10.85L133.07,36.37A14.09,14.09,0,0,0,122.3,53l33.19,157.81a14,14,0,0,0,6.1,8.9,13.85,13.85,0,0,0,7.57,2.26,13.55,13.55,0,0,0,3-.32l46.81-10.05A14.09,14.09,0,0,0,229.7,195Zm-82.81-83.32,50.73-10.9,14.12,67.16L161,178.81Zm-6.63-31.56L191,69.19,195.15,89l-50.73,10.9Zm-4.66-32,46.8-10.05a2.18,2.18,0,0,1,.42,0,1.89,1.89,0,0,1,1.05.32,2,2,0,0,1,.89,1.31l3.75,17.82L137.79,68.34l-3.74-17.78A2.07,2.07,0,0,1,135.6,48.1Zm80.81,151.8L169.6,210a1.92,1.92,0,0,1-1.47-.27,2,2,0,0,1-.89-1.31l-3.75-17.82,50.72-10.9L218,197.43A2.07,2.07,0,0,1,216.41,199.9Z',
            ),
          ]),
        ],
      )
