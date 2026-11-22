import { Schema } from 'effect'
import type { Config } from '@foldkit-visuals/ramka/lightbox'
import coast from './assets/photos/coast.webp?url'
import desert from './assets/photos/desert.webp?url'
import lake from './assets/photos/lake.webp?url'
import mountains from './assets/photos/mountains.webp?url'
import peaks from './assets/photos/peaks.webp?url'
import trees from './assets/photos/trees.webp?url'

export const Example = Schema.Literals([
  'photos-app',
  'photos-app-rtl',
  'infinite-scroll',
  'url-synced-state',
  'intercepted-routes',
  'text-message',
  'film-trailers',
  '3d-models',
])
export type Example = typeof Example.Type

export const examples = {
  'photos-app': {
    name: 'Photos app',
    description: 'Browse, swipe and zoom through a photo library.',
  },
  'photos-app-rtl': {
    name: 'Photos app (RTL)',
    description: 'Browse the same gallery with Arabic labels and right-to-left navigation.',
  },
  'infinite-scroll': {
    name: 'Infinite scroll',
    description: 'Scroll the photo grid to load more. New tiles join the same lightbox.',
  },
  'url-synced-state': {
    name: 'URL-synced state',
    description:
      'Share an open photo by copying its URL. Use Back and Forward to revisit the lightbox.',
  },
  'intercepted-routes': {
    name: 'Intercepted routes',
    description:
      'Opening a photo keeps the gallery in place. Visiting the photo link directly shows a standalone photo.',
  },
  'text-message': {
    name: 'Text message',
    description: 'Open an attachment alongside its conversation.',
  },
  'film-trailers': {
    name: 'Film trailers',
    description: 'Watch the Blender Open Movies collection in the lightbox.',
  },
  '3d-models': {
    name: '3D models',
    description: 'Rotate a model in the lightbox. Its grid tile keeps the same angle.',
  },
} satisfies Record<Example, { readonly name: string; readonly description: string }>

export const photos = [
  { id: 'mountains', name: 'Rocky mountains', arabic: 'جبال صخرية', src: mountains },
  { id: 'trees', name: 'Forest canopy', arabic: 'أشجار الغابة', src: trees },
  { id: 'coast', name: 'Ocean waves', arabic: 'أمواج المحيط', src: coast },
  { id: 'desert', name: 'Sand dunes', arabic: 'كثبان رملية', src: desert },
  { id: 'lake', name: 'Lakeside cabin', arabic: 'كوخ بجانب البحيرة', src: lake },
  { id: 'peaks', name: 'Mountain meadow', arabic: 'مرج جبلي', src: peaks },
] as const

export const films = [
  {
    id: 'sintel',
    name: 'Sintel',
    year: '2010',
    tone: 'bg-stone-800',
    src: 'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4',
  },
  {
    id: 'big-buck-bunny',
    name: 'Big Buck Bunny',
    year: '2008',
    tone: 'bg-emerald-900',
    src: 'https://download.blender.org/peach/trailer/trailer_iphone.m4v',
  },
  {
    id: 'tears-of-steel',
    name: 'Tears of Steel',
    year: '2012',
    tone: 'bg-sky-950',
    src: 'https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4',
  },
  {
    id: 'elephants-dream',
    name: 'Elephants Dream',
    year: '2006',
    tone: 'bg-indigo-950',
    src: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
  },
]

export const objects = [
  { id: 'copper', name: 'Copper cube', tones: ['bg-amber-600', 'bg-amber-700', 'bg-amber-500'] },
  { id: 'jade', name: 'Jade cube', tones: ['bg-emerald-600', 'bg-emerald-700', 'bg-emerald-500'] },
  { id: 'cobalt', name: 'Cobalt cube', tones: ['bg-blue-600', 'bg-blue-700', 'bg-blue-500'] },
]

export const limit = 30
export const batch = 6
export const photo = (index: number) => photos[index % photos.length] ?? photos[0]

export function itemDefinitions(example: Example, count = batch) {
  if (example === 'film-trailers' || example === '3d-models')
    return (example === 'film-trailers' ? films : objects).map(({ id, name }) => ({
      id,
      caption: name,
      alt: name,
      width: 768,
      height: example === 'film-trailers' ? 432 : 512,
      zoom: { maxZoom: 1 },
    }))
  const total =
    example === 'infinite-scroll' ? count : example === 'text-message' ? 2 : photos.length
  return Array.from({ length: total }, (_, index) => {
    const image = photo(index)
    const name = example === 'photos-app-rtl' ? image.arabic : image.name
    return {
      id: example === 'infinite-scroll' ? `photo-${index + 1}` : image.id,
      caption: example === 'infinite-scroll' ? `${name} · ${index + 1}` : name,
      alt: name,
      width: 960,
      height: 640,
    }
  })
}

export const lightboxConfig = (example: Example) =>
  ({
    id: `ramka-example-${example}`,
    items: itemDefinitions(example),
    options: {
      loop: example !== 'infinite-scroll',
      viewTransition: 'default',
      ...(example === 'photos-app-rtl' ? { dir: 'rtl' } : {}),
      ...(example === 'text-message' ? { morphTo: 'origin' } : {}),
    },
  }) satisfies Config
