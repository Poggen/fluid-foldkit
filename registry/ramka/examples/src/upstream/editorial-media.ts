/* @license Ramka examples adaptation. MIT. Copyright (c) 2026 Artur Bień. */
import msg1 from './assets/editorial/msg1.jpg?url'
import msg2 from './assets/editorial/msg2.jpg?url'
import msg3 from './assets/editorial/msg3.jpg?url'
import bbb from './assets/editorial/bbb-poster.jpg?url'
import ed from './assets/editorial/ed-poster.jpg?url'
import sintel from './assets/editorial/sintel-poster.jpg?url'
import tos from './assets/editorial/tos-poster.png?url'

export const attachments = [
  {
    id: 'msg1',
    src: msg1,
    thumb: msg1,
    alt: 'Screenshot of a changelog notification',
    width: 1200,
    height: 1600,
  },
  {
    id: 'msg2',
    src: msg2,
    thumb: msg2,
    alt: 'Screenshot of a code review discussion',
    width: 1200,
    height: 1600,
  },
  {
    id: 'msg3',
    src: msg3,
    thumb: msg3,
    alt: 'Screenshot of a pull request overview',
    width: 1200,
    height: 1600,
  },
]

export const films = [
  {
    id: 'bbb',
    title: 'Big Buck Bunny',
    year: 2008,
    genre: 'Animation',
    poster: bbb,
    video: 'https://download.blender.org/peach/trailer/trailer_iphone.m4v',
    width: 480,
    height: 270,
  },
  {
    id: 'ed',
    title: "Elephant's Dream",
    year: 2006,
    genre: 'Sci-Fi',
    poster: ed,
    video: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
    width: 426,
    height: 240,
  },
  {
    id: 'sintel',
    title: 'Sintel',
    year: 2010,
    genre: 'Fantasy',
    poster: sintel,
    video: 'https://download.blender.org/durian/trailer/sintel_trailer-720p.mp4',
    width: 1280,
    height: 720,
  },
  {
    id: 'tos',
    title: 'Tears of Steel',
    year: 2012,
    genre: 'Sci-Fi',
    poster: tos,
    video: 'https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4',
    width: 862,
    height: 360,
  },
]
