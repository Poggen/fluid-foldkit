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
              'M176,232a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,232Zm40-128a87.55,87.55,0,0,1-33.64,69.21A16.24,16.24,0,0,0,176,186v6a16,16,0,0,1-16,16H96a16,16,0,0,1-16-16v-6a16,16,0,0,0-6.23-12.66A87.59,87.59,0,0,1,40,104.49C39.74,56.83,78.26,17.14,125.88,16A88,88,0,0,1,216,104Zm-16,0a72,72,0,0,0-73.74-72c-39,.92-70.47,33.39-70.26,72.39a71.65,71.65,0,0,0,27.64,56.3A32,32,0,0,1,96,186v6h64v-6a32.15,32.15,0,0,1,12.47-25.35A71.65,71.65,0,0,0,200,104Zm-16.11-9.34a57.6,57.6,0,0,0-46.56-46.55,8,8,0,0,0-2.66,15.78c16.57,2.79,30.63,16.85,33.44,33.45A8,8,0,0,0,176,104a9,9,0,0,0,1.35-.11A8,8,0,0,0,183.89,94.66Z',
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
              'M174,232a6,6,0,0,1-6,6H88a6,6,0,0,1,0-12h80A6,6,0,0,1,174,232Zm40-128a85.56,85.56,0,0,1-32.88,67.64A18.23,18.23,0,0,0,174,186v6a14,14,0,0,1-14,14H96a14,14,0,0,1-14-14v-6a18,18,0,0,0-7-14.23h0a85.59,85.59,0,0,1-33-67.24C41.74,57.91,79.39,19.12,125.93,18A86,86,0,0,1,214,104Zm-12,0a74,74,0,0,0-75.79-74C86.17,31,53.78,64.34,54,104.42a73.67,73.67,0,0,0,28.4,57.87A29.92,29.92,0,0,1,94,186v6a2,2,0,0,0,2,2h64a2,2,0,0,0,2-2v-6a30.18,30.18,0,0,1,11.7-23.78A73.59,73.59,0,0,0,202,104Zm-20.08-9A55.58,55.58,0,0,0,137,50.08a6,6,0,1,0-2,11.84C152.38,64.84,167.13,79.6,170.08,97a6,6,0,0,0,5.91,5,6.87,6.87,0,0,0,1-.08A6,6,0,0,0,181.92,95Z',
            ),
          ]),
        ],
      )
