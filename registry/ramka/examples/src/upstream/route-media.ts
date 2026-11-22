/* @license MIT. Adapted from Ramka upstream 9eaaab4, Copyright (c) 2026 Artur Bień. */
import p1 from './assets/routing/mb-01.jpg?url'
import p2 from './assets/routing/mb-02.jpg?url'
import p3 from './assets/routing/mb-03.jpg?url'
import p4 from './assets/routing/mb-04.jpg?url'
import p5 from './assets/routing/mb-05.jpg?url'
import p6 from './assets/routing/mb-06.jpg?url'
import p7 from './assets/routing/mb-07.jpg?url'
import p8 from './assets/routing/mb-08.jpg?url'
import p9 from './assets/routing/mb-09.jpg?url'
import p10 from './assets/routing/mb-10.jpg?url'
import p11 from './assets/routing/mb-11.jpg?url'
import p12 from './assets/routing/mb-12.jpg?url'

export const routePhotos = [
  {
    id: '1',
    src: p1,
    thumb: p1,
    alt: 'Foggy pine ridge at dawn',
    caption: 'Dawn ridge',
    width: 800,
    height: 1200,
  },
  {
    id: '2',
    src: p2,
    thumb: p2,
    alt: 'Empty coastal highway',
    caption: 'Open road',
    width: 800,
    height: 533,
  },
  {
    id: '3',
    src: p3,
    thumb: p3,
    alt: 'Overhead of a linen breakfast table',
    caption: 'Slow morning',
    width: 800,
    height: 800,
  },
  {
    id: '4',
    src: p4,
    thumb: p4,
    alt: 'Narrow sunlit alley',
    caption: 'Warm alley',
    width: 800,
    height: 1200,
  },
  {
    id: '5',
    src: p5,
    thumb: p5,
    alt: 'Wide desert dunes',
    caption: 'Dunes',
    width: 800,
    height: 467,
  },
  {
    id: '6',
    src: p6,
    thumb: p6,
    alt: 'Rain on a window',
    caption: 'Rainy glass',
    width: 800,
    height: 1025,
  },
  {
    id: '7',
    src: p7,
    thumb: p7,
    alt: 'Calm lake reflection',
    caption: 'Still water',
    width: 800,
    height: 533,
  },
  {
    id: '8',
    src: p8,
    thumb: p8,
    alt: 'Tall concrete staircase',
    caption: 'Ascent',
    width: 800,
    height: 1200,
  },
  {
    id: '9',
    src: p9,
    thumb: p9,
    alt: 'Close-up of dried flowers',
    caption: 'Pressed petals',
    width: 800,
    height: 800,
  },
  {
    id: '10',
    src: p10,
    thumb: p10,
    alt: 'Panoramic city skyline at dusk',
    caption: 'Dusk skyline',
    width: 800,
    height: 451,
  },
  {
    id: '11',
    src: p11,
    thumb: p11,
    alt: 'Single tree in a green field',
    caption: 'Lone tree',
    width: 800,
    height: 1161,
  },
  {
    id: '12',
    src: p12,
    thumb: p12,
    alt: 'Textured stone wall',
    caption: 'Stonework',
    width: 800,
    height: 800,
  },
] as const

export const interceptedPhotos = [
  routePhotos[0],
  routePhotos[1],
  routePhotos[3],
  routePhotos[4],
  routePhotos[6],
  routePhotos[7],
  routePhotos[9],
  routePhotos[10],
].map((photo, i) => ({ ...photo, id: String(i + 1) }))
