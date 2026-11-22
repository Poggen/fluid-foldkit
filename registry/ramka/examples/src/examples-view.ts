import type { Model, ViewInputs } from '@foldkit-visuals/ramka/lightbox'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'
import { batch, examples, films, limit, objects, photo, photos, type Example } from './example-data'
import { examplePage } from './example-location'

const rtlLabels = {
  label: 'مكتبة الصور',
  carouselLabel: 'الصور',
  closeLabel: 'إغلاق',
  previousLabel: 'السابق',
  nextLabel: 'التالي',
  zoomInLabel: 'تكبير',
  zoomOutLabel: 'تصغير',
  thumbnailsLabel: 'اختر صورة',
}

function filmCover<Message, Mounts>(index: number, h: HtmlBuilder<Message, Mounts>) {
  const film = films[index]
  if (film === undefined) return null
  return h.span(
    [
      h.Class(
        `flex aspect-video w-full flex-col justify-end p-3 text-start text-white ${film.tone}`,
      ),
    ],
    [
      h.span([h.Class('text-xs uppercase tracking-wide text-white/70')], [film.year]),
      h.span([h.Class('font-medium')], [film.name]),
    ],
  )
}

function cube<Message, Mounts>(
  model: (typeof objects)[number],
  angle: number,
  small: boolean,
  h: HtmlBuilder<Message, Mounts>,
) {
  const scale = small ? 0.42 : 1
  const faces = [
    [model.tones[0], 'translateZ(36px)'],
    [model.tones[0], 'rotateY(180deg) translateZ(36px)'],
    [model.tones[1], 'rotateY(90deg) translateZ(36px)'],
    [model.tones[1], 'rotateY(-90deg) translateZ(36px)'],
    [model.tones[2], 'rotateX(90deg) translateZ(36px)'],
    [model.tones[2], 'rotateX(-90deg) translateZ(36px)'],
  ] as const
  return h.span(
    [h.Class('grid h-full w-full place-items-center [perspective:550px]'), h.AriaHidden(true)],
    [
      h.span(
        [
          h.Class('relative block size-[72px] [transform-style:preserve-3d]'),
          h.Style({ transform: `scale(${scale}) rotateX(-22deg) rotateY(${angle}deg)` }),
          h.DataAttribute('orbit-angle', String(angle)),
        ],
        faces.map(([tone, transform]) =>
          h.span([
            h.Class(`absolute inset-0 border border-white/35 ${tone}`),
            h.Style({ transform }),
          ]),
        ),
      ),
    ],
  )
}

interface ExampleView<Message, Mounts> {
  readonly example: Example
  readonly model: Model
  readonly standalone: string | null
  readonly angles: Readonly<Record<string, number>>
  readonly location: ReadonlyArray<Attribute<Message, Mounts>>
  readonly sentinel: (count: number) => Html
  readonly changeOrbit: (id: string, angle: number) => Message
  readonly embed: (inputs: ViewInputs) => Html
}

export function renderRamkaExample<Message, Mounts>(
  {
    example,
    model,
    standalone,
    angles,
    location,
    sentinel,
    changeOrbit,
    embed,
  }: ExampleView<Message, Mounts>,
  h: HtmlBuilder<Message, Mounts>,
) {
  const { name, description } = examples[example]
  const rtl = example === 'photos-app-rtl'
  const infinite = example === 'infinite-scroll'
  const chat = example === 'text-message'
  const film = example === 'film-trailers'
  const orbit = example === '3d-models'
  const count = model.items.length
  const image = (index: number, thumbnail: boolean) => {
    const media = photo(index)
    return h.img([
      h.Src(media.src),
      h.Alt(thumbnail ? '' : (model.items[index]?.alt ?? media.name)),
      h.Loading('lazy'),
      h.Width('960'),
      h.Height('640'),
      h.Draggable(false),
    ])
  }
  const headingId = `ramka-${example}-heading`
  const attached = h.div(
    [h.Class('rounded-[var(--fluid-radius,8px)] border px-3 py-2 text-sm')],
    ['A few photos from the trip. Which one should we print?'],
  )
  const routePhoto =
    example === 'intercepted-routes' ? photos.find(({ id }) => standalone === id) : undefined
  const gallery = embed({
    ...(rtl ? rtlLabels : { label: name, carouselLabel: `${name} slides` }),
    className:
      '[&_.ramka-triggers]:grid [&_.ramka-triggers]:grid-cols-3 [&_.ramka-triggers]:gap-2 [&_[data-ramka-trigger]]:min-w-0 [&_[data-ramka-trigger]]:overflow-hidden [&_[data-ramka-trigger]]:rounded-lg [&_[data-ramka-trigger]]:focus-visible:outline-2 [&_[data-ramka-trigger]]:focus-visible:outline-offset-2 [&_[data-ramka-trigger]_img]:block [&_[data-ramka-trigger]_img]:aspect-[3/2] [&_[data-ramka-trigger]_img]:w-full [&_[data-ramka-trigger]_img]:object-cover',
    hasZoom: !(film || orbit),
    trigger: (index) => {
      if (film) return [filmCover(index, h)]
      const object = orbit ? objects[index] : undefined
      if (object !== undefined)
        return [
          h.span(
            [h.Class('block h-20 w-full bg-black/90')],
            [cube(object, angles[object.id] ?? 28, true, h)],
          ),
          h.span([h.Class('sr-only')], [object.name]),
        ]
      return [
        image(index, true),
        h.span([h.Class('sr-only')], [model.items[index]?.caption ?? 'Photo']),
      ]
    },
    thumbnail: (index) => {
      if (film) return [films[index]?.name ?? '']
      if (orbit) return [objects[index]?.name ?? '']
      return [image(index, true)]
    },
    item: (index, { active }) => {
      if (film) {
        const entry = films[index]
        return active && entry !== undefined
          ? h.video(
              [
                h.Key(entry.id),
                h.Src(entry.src),
                h.Controls(true),
                h.Playsinline(true),
                h.Preload('metadata'),
                h.AriaLabel(entry.name),
                h.Class('h-full w-full touch-auto'),
              ],
              [h.a([h.Href(entry.src)], [`Watch ${entry.name} at Blender`])],
            )
          : filmCover(index, h)
      }
      const object = orbit ? objects[index] : undefined
      if (object !== undefined) {
        const angle = angles[object.id] ?? 28
        return h.div(
          [h.Class('flex h-full w-full flex-col items-center bg-black/90 p-5')],
          [
            h.div([h.Class('min-h-0 w-full flex-1')], [cube(object, angle, false, h)]),
            active
              ? h.label(
                  [h.Class('flex w-full max-w-xs flex-col gap-2 text-sm')],
                  [
                    'Orbit angle',
                    h.input([
                      h.Type('range'),
                      h.Min('0'),
                      h.Max('359'),
                      h.Value(String(angle)),
                      h.OnInput((value) => changeOrbit(object.id, Number(value))),
                      h.Class('w-full accent-white'),
                    ]),
                  ],
                )
              : null,
          ],
        )
      }
      return image(index, false)
    },
  })
  return h.section(
    [h.Key(example), h.AriaLabelledBy(headingId), h.Class('space-y-3'), ...location],
    [
      h.h3([h.Id(headingId), h.Class('text-base font-medium')], [name]),
      h.p([h.Class('text-sm text-[var(--fluid-text-muted)]')], [description]),
      routePhoto === undefined
        ? h.div(
            [
              h.Class(
                infinite
                  ? 'h-52 overflow-y-auto overscroll-contain rounded-xl border p-3'
                  : 'space-y-3 rounded-xl border p-3',
              ),
              ...(infinite
                ? [h.Tabindex(0), h.AriaLabel('Scrollable photo grid'), h.Role('region')]
                : []),
              ...(rtl ? [h.Dir('rtl'), h.Lang('ar')] : []),
            ],
            [
              chat ? attached : null,
              gallery,
              infinite && count < limit && count >= batch ? sentinel(count) : null,
              infinite ? h.p([h.Class('mt-2 text-center text-xs')], [`${count} photos`]) : null,
              chat
                ? h.p(
                    [h.Class('text-xs text-[var(--fluid-text-muted)]')],
                    ['2 attachments · 10:42'],
                  )
                : null,
            ],
          )
        : h.figure(
            [h.Class('space-y-2'), h.Id('ramka-standalone')],
            [
              h.img([h.Src(routePhoto.src), h.Alt(routePhoto.name), h.Class('w-full rounded-xl')]),
              h.figcaption([], [routePhoto.name]),
              h.a([h.Href(examplePage), h.Class('underline')], ['Back to gallery']),
            ],
          ),
      example === 'intercepted-routes' && routePhoto === undefined
        ? h.a(
            [
              h.Href(`${examplePage}?ramka-route=mountains`),
              h.Target('_blank'),
              h.Rel('noopener'),
              h.Class('text-sm underline'),
            ],
            ['Open a photo directly (new tab)'],
          )
        : null,
    ],
  )
}
