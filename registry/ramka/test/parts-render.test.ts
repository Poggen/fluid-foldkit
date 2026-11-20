// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest HappyDOM environment directive.
// @vitest-environment happy-dom
import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
// oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
// @effect-diagnostics-next-line nodeBuiltinImport:off -- This SSR contract reads the actual structural stylesheet as an independent oracle; filesystem access remains inside the test fixture.
import { readFile } from 'node:fs/promises'
import { Effect, Schema } from 'effect'
import { Block, Mount, Scene } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { childAttributes } from 'foldkit/html'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Parts from '../src/parts.js'
import { getTriggerContext } from '../src/context.js'
import type { PartContext } from '../src/parts-contracts.js'
import { LIGHTBOX_PART_IDENTITY_ATTRIBUTES } from '../src/upstream/lightbox-data-attributes.js'
const Message = defineMessageUnion({ Noop: {}, Recorded: { name: Schema.String } })
type Message = typeof Message.Type
const PageKey = Symbol('PartsServerContract')
const Page = Block.make('PartsServerContract', {
  key: PageKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ events: Schema.Array(Schema.String) }),
  Message,
  view: { kind: 'Document' },
})
const Composition = Page.makeComposition({})
function render(body: (h: HtmlBuilder<Message>) => Html) {
  return Effect.gen(function* () {
    const layer = Page.makeLayer({
      init: Composition.makeInit(() => ({ model: { events: [] } })),
      update: Composition.makeUpdate({
        Noop: Page.makeNoopStep(),
        Recorded: (model, { name }) => ({ model: { events: [...model.events, name] } }),
      }),
      view: Composition.makeView((_model, h) => ({ title: 'Render contract', body: body(h) })),
    })
    const result = yield* renderToString({ block: Page, layer }, {}, { isHydratable: false })
    const root = document.createElement('div')
    root.innerHTML = result.html
    return root
  })
}
const context: PartContext = {
  id: 'gallery',
  open: true,
  index: 0,
  count: 5,
  dir: 'ltr',
  loop: false,
  caption: ['Visible caption'],
  zoom: 1,
  x: 0,
  y: 0,
  minZoom: 1,
  maxZoom: 4,
  preload: 1,
  hasThumbnails: false,
  openAt: () => [],
  close: [],
  navigate: () => [],
  previous: [],
  next: [],
  zoomIn: [],
  zoomOut: [],
  resetZoom: [],
}
describe('parts through the Foldkit server boundary', () => {
  it.effect(
    'keeps the physical dialog open during retained closing capture without publishing logical open',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          Parts.Content(
            {},
            {
              ...context,
              open: false,
              nativeOpen: true,
              parked: false,
            },
            h,
          ),
        )
        const content = root.querySelector('dialog')
        expect(content?.hasAttribute('open')).toBe(true)
        expect(content?.hasAttribute('data-closed')).toBe(true)
        expect(content?.hasAttribute('data-open')).toBe(false)
        expect(content?.hasAttribute('inert')).toBe(false)
        const closed = yield* render((h) =>
          Parts.Content({}, { ...context, open: false, nativeOpen: false }, h),
        )
        expect(closed.querySelector('dialog')?.hasAttribute('open')).toBe(false)
      }),
  )
  it('removes pull snap timing declarations when the runtime stops supplying them', () => {
    Scene.scene(
      {
        update: (snapping: boolean, _message: Message) => ({ model: !snapping }),
        view: (snapping, h) =>
          h.main(
            [],
            [
              h.button([h.OnClick(Message.Noop())], ['Finish snap']),
              Parts.Content(
                {},
                {
                  ...context,
                  ...(snapping ? { pullSnapDuration: '175ms', pullSnapEasing: 'linear' } : {}),
                },
                h,
              ),
            ],
          ),
      },
      Scene.given(true),
      Scene.expect(Scene.selector('dialog')).toHaveStyle('--lightbox-pull-snap-duration', '175ms'),
      Scene.expect(Scene.selector('dialog')).toHaveStyle('--lightbox-pull-snap-easing', 'linear'),
      Scene.click(Scene.role('button', { name: 'Finish snap' })),
      Scene.expect(Scene.selector('dialog')).not.toHaveStyle('--lightbox-pull-snap-duration'),
      Scene.expect(Scene.selector('dialog')).not.toHaveStyle('--lightbox-pull-snap-easing'),
    )
  })
  it('retains native open and morph target across initial-paint retirement and clears both on close', () => {
    Scene.scene(
      {
        update: (phase: number, _message: Message) => ({ model: phase + 1 }),
        view: (phase, h) => {
          const projected = { ...context, ssr: phase === 0, open: phase < 2 }
          return h.main(
            [],
            [
              h.button([h.OnClick(Message.Noop())], ['Advance phase']),
              Parts.Trigger({ index: 0, children: ['Open gallery'] }, projected, h),
              Parts.Content({}, projected, h),
            ],
          )
        },
      },
      Scene.given(0),
      Scene.expect(Scene.selector('[data-ramka-content]')).toHaveAttr('open'),
      Scene.expect(Scene.selector('[data-ramka-trigger]')).toHaveAttr('data-morph-target'),
      Scene.click(Scene.role('button', { name: 'Advance phase' })),
      Scene.expect(Scene.selector('[data-ramka-content]')).toHaveAttr('open'),
      Scene.expect(Scene.selector('[data-ramka-trigger]')).toHaveAttr('data-morph-target'),
      Scene.click(Scene.role('button', { name: 'Advance phase' })),
      Scene.expect(Scene.selector('[data-ramka-content]')).toHaveAttr('open', 'false'),
      Scene.expect(Scene.selector('[data-ramka-trigger]')).not.toHaveAttr('data-morph-target'),
    )
  })
  it.effect(
    'projects focus only onto the identified thumbnail group and keeps standalone context support',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          h.main(
            [],
            [
              ...['first', 'second'].map((id) =>
                Parts.ThumbnailGroup(
                  {
                    render: (attributes, children, state) =>
                      h.section(
                        [
                          ...attributes,
                          h.Attribute('data-render-focus', String(state.focusWithin)),
                        ],
                        children,
                      ),
                  },
                  {
                    ...context,
                    thumbnailGroupId: id,
                    focusedThumbnailGroup: 'second',
                    focusWithin: true,
                  },
                  h,
                ),
              ),
              Parts.ThumbnailStripTrack(
                {},
                {
                  ...context,
                  thumbnailGroupId: 'track',
                  focusedThumbnailGroup: 'track',
                },
                h,
              ),
              Parts.ThumbnailGroup({}, { ...context, focusWithin: true }, h),
            ],
          ),
        )
        const first = root.querySelector('[data-ramka-group-id="first"]')
        const second = root.querySelector('[data-ramka-group-id="second"]')
        expect(first?.getAttribute('data-render-focus')).toBe('false')
        expect(first?.hasAttribute('data-focus-within')).toBe(false)
        expect(second?.getAttribute('data-render-focus')).toBe('true')
        expect(second?.hasAttribute('data-focus-within')).toBe(true)
        expect(
          root.querySelector('[data-ramka-group-id="track"]')?.hasAttribute('data-focus-within'),
        ).toBe(true)
        expect(
          root
            .querySelector('[data-ramka-thumbnail-group]:not([data-ramka-group-id])')
            ?.hasAttribute('data-focus-within'),
        ).toBe(true)
      }),
  )
  it('omits a closed nonretained custom Portal without acquiring child mounts', () => {
    const ChildMount = Mount.define('PortalChild', { messages: [Message.Noop] })
    Scene.scene(
      {
        update: (model: number, _message: Message) => ({ model }),
        view: (_model, h) =>
          h.main(
            [],
            [
              Parts.Portal(
                {
                  render: (attributes, children) => h.section(attributes, children),
                  children: [h.div([h.OnMount(ChildMount())], ['Expensive child'])],
                },
                { ...context, open: false, mounted: false, keepMounted: false, parked: true },
                h,
              ),
            ],
          ),
      },
      Scene.given(0),
      Scene.expect(Scene.selector('[data-ramka-portal]')).toBeAbsent(),
      Scene.Mount.expectNone(),
    )
  })
  it.effect('retains parked Portal hosts and leaves mounted closing hosts visible', () =>
    Effect.gen(function* () {
      const root = yield* render((h) =>
        h.main(
          [],
          [true, false].map((parked) => {
            const projected = {
              ...context,
              open: false,
              mounted: !parked,
              keepMounted: parked,
              parked,
            }
            return Parts.Portal(
              {
                attributes: childAttributes([
                  h.Attribute('data-phase', parked ? 'parked' : 'closing'),
                ]),
                children: [Parts.Content({ children: ['Retained child'] }, projected, h)],
              },
              projected,
              h,
            )
          }),
        ),
      )
      const parked = root.querySelector<HTMLElement>('[data-phase="parked"]')
      expect(parked?.style.visibility).toBe('hidden')
      expect(parked?.style.pointerEvents).toBe('none')
      expect(parked?.querySelector('dialog')?.hasAttribute('inert')).toBe(true)
      expect(parked?.textContent).toBe('Retained child')
      const closing = root.querySelector<HTMLElement>('[data-phase="closing"]')
      expect(closing?.style.visibility).toBe('')
      expect(closing?.style.pointerEvents).toBe('')
      expect(closing?.querySelector('dialog')?.hasAttribute('inert')).toBe(false)
    }),
  )
  it.effect(
    'publishes offset-only animation targets without arming zoomed chrome at minimum zoom',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) => {
          const animating = {
            ...context,
            x: 10,
            y: -5,
            zoomAnimationTarget: 1,
            zoomAnimationX: 0,
            zoomAnimationY: 0,
            zoomAnimationChangesZoom: false,
          }
          return Parts.Content(
            {
              children: [
                Parts.Zoom(
                  {
                    render: (attributes, children, state) =>
                      h.section(
                        [
                          ...attributes,
                          h.Attribute(
                            'data-pose',
                            `${state.zoom}/${state.offsetX}/${state.offsetY}`,
                          ),
                        ],
                        children,
                      ),
                  },
                  animating,
                  h,
                ),
              ],
            },
            animating,
            h,
          )
        })
        expect(root.querySelector('dialog')?.hasAttribute('data-zoomed')).toBe(false)
        expect(root.querySelector('section')?.getAttribute('data-pose')).toBe('1/0/0')
        expect(root.querySelector<HTMLElement>('[data-lightbox-transform]')?.style.transform).toBe(
          'scale(1) translate(10px, -5px)',
        )
      }),
  )
  it.effect(
    'keeps standalone items mounted and gates only carousel children while retaining snap boxes',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          h.main(
            [],
            [
              Parts.Item({ index: 4, children: ['Standalone content'] }, context, h),
              Parts.Slides(
                {
                  children: [
                    Parts.Slide(
                      {
                        index: 4,
                        children: [
                          Parts.Item(
                            { index: 4, children: ['Distant content'] },
                            { ...context, inSlides: true },
                            h,
                          ),
                        ],
                      },
                      context,
                      h,
                    ),
                    Parts.Slide(
                      {
                        index: 1,
                        children: [
                          Parts.Item(
                            { index: 1, children: ['Preloaded content'] },
                            { ...context, inSlides: true },
                            h,
                          ),
                        ],
                      },
                      context,
                      h,
                    ),
                  ],
                },
                context,
                h,
              ),
            ],
          ),
        )
        expect(root.textContent).toContain('Standalone content')
        expect(root.textContent).not.toContain('Distant content')
        expect(root.textContent).toContain('Preloaded content')
        expect(root.querySelectorAll('[data-ramka-slide]')).toHaveLength(2)
        expect(
          root.querySelector('[data-ramka-slide][data-index="4"] [data-ramka-item]'),
        ).toBeNull()
      }),
  )
  it.effect('exposes named standalone groups and correctly associated tabs with one tab stop', () =>
    Effect.gen(function* () {
      const root = yield* render((h) =>
        h.main(
          [],
          [
            Parts.Item(
              { index: 0, label: '1 av 5', roleDescription: 'bild', children: ['Standalone'] },
              context,
              h,
            ),
            Parts.Slides({ label: 'Bilder', roleDescription: 'karusell' }, context, h),
            Parts.ThumbnailGroup(
              {
                label: 'Välj bild',
                children: [0, 1].map((index) =>
                  Parts.Thumbnail(
                    { index, label: `Bild ${index + 1}` },
                    { ...context, hasThumbnails: true },
                    h,
                  ),
                ),
              },
              context,
              h,
            ),
            ...[0, 1].map((index) =>
              Parts.Item(
                { index, children: [`Panel ${index}`] },
                { ...context, hasThumbnails: true },
                h,
              ),
            ),
          ],
        ),
      )
      const standalone = root.querySelector('[data-ramka-item]')
      expect(standalone?.getAttribute('role')).toBe('group')
      expect(standalone?.getAttribute('aria-label')).toBe('1 av 5')
      expect(standalone?.getAttribute('aria-roledescription')).toBe('bild')
      expect(root.querySelector('[data-ramka-slides]')?.getAttribute('role')).toBe('group')
      expect(root.querySelector('[data-ramka-slides]')?.getAttribute('aria-label')).toBe('Bilder')
      const tabs = root.querySelectorAll('[role="tab"]')
      expect(Array.from(tabs, (tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1'])
      for (const tab of tabs) {
        const panels = root.querySelectorAll(
          `[role="tabpanel"][id="${tab.getAttribute('aria-controls')}"]`,
        )
        expect(panels).toHaveLength(1)
        expect(panels[0]?.getAttribute('aria-labelledby')).toBe(tab.id)
      }
      const inactive = root.querySelector('[role="tabpanel"][aria-hidden="true"]')
      expect(inactive?.hasAttribute('inert')).toBe(true)
      expect(root.querySelector('[role="tabpanel"][data-active]')?.hasAttribute('inert')).toBe(
        false,
      )
    }),
  )
  it.effect(
    'preserves generated attributes, children and precise state in consumer-owned host elements',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          Parts.Item(
            {
              index: 0,
              attributes: childAttributes([h.Class('consumer-item')]),
              children: [
                Parts.Zoom(
                  {
                    children: ['Pixels'],
                    render: (attributes, children, state) =>
                      h.section(
                        [...attributes, h.Attribute('data-current-zoom', String(state.zoom))],
                        children,
                      ),
                  },
                  { ...context, zoom: 2, x: 12, y: -8 },
                  h,
                ),
              ],
              render: (attributes, children, state) =>
                h.article(
                  [
                    ...attributes,
                    h.Attribute(
                      'data-item-state',
                      `${state.active}/${state.visible}/${state.index}`,
                    ),
                  ],
                  children,
                ),
            },
            context,
            h,
          ),
        )
        const item = root.querySelector('article')
        expect(item?.getAttribute('data-item-state')).toBe('true/true/0')
        expect(item?.className).toBe('consumer-item')
        expect(item?.getAttribute('role')).toBe('group')
        expect(item?.hasAttribute('data-ramka-item')).toBe(true)
        const zoom = item?.querySelector('section[data-ramka-zoom]')
        expect(zoom?.getAttribute('data-current-zoom')).toBe('2')
        expect(zoom?.hasAttribute('data-zoom')).toBe(true)
        expect(zoom?.querySelector<HTMLElement>('[data-lightbox-transform]')?.style.transform).toBe(
          'scale(2) translate(12px, -8px)',
        )
        expect(zoom?.textContent).toBe('Pixels')
      }),
  )
  it.effect(
    'publishes part identities, including the thumbnail group semantics inherited by the strip track',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          h.main(
            [],
            [
              Parts.Trigger({ index: 0 }, context, h),
              Parts.Portal({}, context, h),
              Parts.Content({ label: 'Gallery' }, context, h),
              Parts.Backdrop({}, context, h),
              Parts.Close({}, context, h),
              Parts.Stage({}, context, h),
              Parts.Slides({}, context, h),
              Parts.Slide({ index: 0 }, context, h),
              Parts.Item({ index: 0 }, context, h),
              Parts.Media({}, context, h),
              Parts.Previous({}, context, h),
              Parts.Next({}, context, h),
              Parts.Counter({}, context, h),
              Parts.Caption({}, context, h),
              Parts.ThumbnailGroup({}, context, h),
              Parts.Thumbnail({ index: 0 }, context, h),
              Parts.ThumbnailStrip({}, context, h),
              Parts.ThumbnailStripTrack({}, context, h),
              Parts.Zoom({}, context, h),
              Parts.ZoomIn({}, context, h),
              Parts.ZoomOut({}, context, h),
            ],
          ),
        )
        for (const marker of LIGHTBOX_PART_IDENTITY_ATTRIBUTES) {
          expect(root.querySelectorAll(`[${marker}]`), marker).toHaveLength(
            marker === 'data-ramka-thumbnail-group' ? 2 : 1,
          )
        }
        const track = root.querySelector('[data-ramka-thumbnail-strip-track]')
        expect(track?.hasAttribute('data-ramka-thumbnail-group')).toBe(true)
        expect(track?.getAttribute('role')).toBe('tablist')
        expect(root.querySelector('dialog')?.hasAttribute('open')).toBe(true)
      }),
  )
  it.effect('inherits page direction unless an explicit direction is supplied', () =>
    Effect.gen(function* () {
      const root = yield* render((h) =>
        h.main(
          [h.Dir('rtl')],
          [
            Parts.Portal(
              {
                children: [
                  Parts.Content(
                    {
                      children: [
                        Parts.Slides(
                          { children: [Parts.ThumbnailGroup({}, context, h)] },
                          context,
                          h,
                        ),
                      ],
                    },
                    context,
                    h,
                  ),
                ],
              },
              context,
              h,
            ),
            Parts.Slides({}, { ...context, dir: 'ltr', dirAttribute: 'ltr' }, h),
          ],
        ),
      )
      for (const element of root.querySelectorAll(
        '[data-ramka-portal], [data-ramka-content], [data-ramka-thumbnail-group]',
      )) {
        expect(element.hasAttribute('dir')).toBe(false)
      }
      expect(
        Array.from(root.querySelectorAll('[data-ramka-slides]'), (element) =>
          element.getAttribute('dir'),
        ),
      ).toEqual([null, 'ltr'])
    }),
  )
  it.effect.each(['ltr', 'rtl'] satisfies ReadonlyArray<'ltr' | 'rtl'>)(
    'positions nonzero SSR slides in %s without double-applying native initial scroll',
    (dir) =>
      Effect.gen(function* () {
        const initial = { ...context, index: 3, dir, dirAttribute: dir, ssr: true, inSlides: true }
        const root = yield* render((h) =>
          Parts.Content(
            {
              label: 'Initial gallery',
              children: [
                Parts.Slides(
                  {
                    ssrSlideShift: true,
                    children: [0, 1, 2, 3, 4].map((index) =>
                      Parts.Slide(
                        {
                          index,
                          children: [
                            Parts.Item({ index, children: [`Slide ${index + 1}`] }, initial, h),
                          ],
                        },
                        initial,
                        h,
                      ),
                    ),
                  },
                  initial,
                  h,
                ),
              ],
            },
            initial,
            h,
          ),
        )
        expect(root.querySelector('dialog')?.hasAttribute('open')).toBe(true)
        expect(root.querySelector('dialog')?.hasAttribute('aria-hidden')).toBe(false)
        const slides = root.querySelector<HTMLElement>('[data-ramka-slides]')
        expect(slides?.getAttribute('dir')).toBe(dir)
        expect(slides?.hasAttribute('data-ssr-shift')).toBe(true)
        expect(slides?.style.getPropertyValue('--lightbox-ssr-index')).toBe('3')
        expect(slides?.style.getPropertyValue('--lightbox-ssr-shift-sign')).toBe(
          dir === 'rtl' ? '1' : '-1',
        )
        const active = root.querySelectorAll('[data-ssr-active]')
        expect(active).toHaveLength(1)
        expect(active[0]?.getAttribute('data-index')).toBe('3')
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(
          yield* Effect.promise(() => readFile(`${import.meta.dirname}/../src/parts.css`, 'utf8')),
        )
        const rules = Array.from(sheet.cssRules).filter((rule) => rule instanceof CSSStyleRule)
        expect(
          rules
            .find((rule) => rule.selectorText === '[data-ssr-active]')
            ?.style.getPropertyValue('scroll-initial-target'),
        ).toBe('nearest')
        expect(
          rules
            .find((rule) => rule.selectorText === '[data-ssr-shift] [data-ssr-active]')
            ?.style.getPropertyValue('scroll-initial-target'),
        ).toBe('none')
        const freeze = rules.find(
          (rule) => rule.selectorText === '[data-ramka-slides][data-ssr-shift]',
        )
        expect(freeze?.style.overflowX).toBe('clip')
        expect(freeze?.style.overflowY).toBe('clip')
        expect(freeze?.style.scrollSnapType).toBe('none')
      }),
  )
  it.effect('disables both zoom controls when the active composition has no zoom surface', () =>
    Effect.gen(function* () {
      const unavailable = { ...context, zoom: 2, zoomAvailable: false }
      const root = yield* render((h) =>
        h.main([], [Parts.ZoomIn({}, unavailable, h), Parts.ZoomOut({}, unavailable, h)]),
      )
      for (const button of root.querySelectorAll('button')) {
        expect(button.disabled).toBe(true)
        expect(button.hasAttribute('data-disabled')).toBe(true)
      }
    }),
  )
  it.effect(
    'preserves the backdrop close action through a consumer-owned host while caller attributes win',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) => {
          const actions = {
            ...context,
            close: childAttributes([h.DataAttribute('ramka-action', 'close')]),
          }
          return h.main(
            [],
            [
              Parts.Backdrop(
                {
                  render: (attributes, children, state) =>
                    h.aside(
                      [...attributes, h.Attribute('data-open-state', String(state.open))],
                      children,
                    ),
                },
                actions,
                h,
              ),
              Parts.Backdrop(
                { attributes: childAttributes([h.DataAttribute('ramka-action', 'consumer')]) },
                actions,
                h,
              ),
            ],
          )
        })
        expect(
          root.querySelector('aside[data-ramka-backdrop]')?.getAttribute('data-ramka-action'),
        ).toBe('close')
        expect(root.querySelector('aside')?.getAttribute('data-open-state')).toBe('true')
        expect(
          root.querySelector('div[data-ramka-backdrop]')?.getAttribute('data-ramka-action'),
        ).toBe('consumer')
      }),
  )
  it.effect('projects the target index onto duplicate triggers and their client DOM markers', () =>
    Effect.gen(function* () {
      const root = yield* render((h) =>
        h.main(
          [],
          [
            ...[
              { id: 'opening-trigger', open: true },
              { id: 'another-trigger', open: true },
              { id: 'opening-trigger', open: false },
            ].map((sample) =>
              Parts.Trigger(
                {
                  index: 0,
                  id: sample.id,
                  render: (attributes, children, state) =>
                    h.button(
                      [
                        ...attributes,
                        h.Attribute('data-render-morph-target', String(state.morphTarget)),
                      ],
                      children,
                    ),
                },
                { ...context, open: sample.open, morphTargetId: 'opening-trigger' },
                h,
              ),
            ),
            Parts.Trigger(
              {
                index: 1,
                render: (attributes, children, state) =>
                  h.button(
                    [
                      ...attributes,
                      h.Attribute('data-render-morph-target', String(state.morphTarget)),
                    ],
                    children,
                  ),
              },
              { ...context, morphTo: 'closest', morphTargetIndex: 1 },
              h,
            ),
          ],
        ),
      )
      expect(
        Array.from(root.querySelectorAll('button'), (button) =>
          button.getAttribute('data-render-morph-target'),
        ),
      ).toEqual(['true', 'true', 'false', 'true'])
      expect(
        Array.from(root.querySelectorAll('button'), (button) =>
          button.hasAttribute('data-morph-target'),
        ),
      ).toEqual([true, true, false, true])
    }),
  )
  it.effect('retains CSP nonce and structural stylesheet bytes in server output', () =>
    Effect.gen(function* () {
      const css = '[data-ramka-stage] { min-width: 0; }'
      const root = yield* render((h) => Parts.CSPProvider({ nonce: 'page-nonce', css }, context, h))
      const style = root.querySelector('style')
      expect(style?.getAttribute('nonce')).toBe('page-nonce')
      expect(style?.textContent).toBe(css)
    }),
  )
  it.effect('merges caller styles without losing media geometry or portal timing', () =>
    Effect.gen(function* () {
      const root = yield* render((h) =>
        h.main(
          [],
          [
            Parts.Media(
              {
                width: 1600,
                height: 900,
                attributes: childAttributes([h.Style({ color: 'red', width: '240px' })]),
              },
              context,
              h,
            ),
            Parts.Portal({ attributes: childAttributes([h.Style({ color: 'blue' })]) }, context, h),
            Parts.Content(
              { attributes: childAttributes([h.Style({ color: 'green' })]) },
              context,
              h,
            ),
          ],
        ),
      )
      const media = root.querySelector<HTMLElement>('[data-ramka-media]')
      expect(media?.style.width).toBe('240px')
      expect(media?.style.aspectRatio).toBe('1600 / 900')
      expect(media?.style.color).toBe('red')
      expect(
        root
          .querySelector<HTMLElement>('[data-ramka-portal]')
          ?.style.getPropertyValue('--lightbox-vt-duration'),
      ).toBe('360ms')
      expect(
        root
          .querySelector<HTMLElement>('[data-ramka-content]')
          ?.style.getPropertyValue('--lightbox-pull-progress'),
      ).toBe('0')
    }),
  )
  it.effect(
    'retires caption fallback after registration and preserves deliberately empty captions',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          h.main(
            [],
            [
              Parts.Caption(
                { children: ['Initial fallback'] },
                { ...context, caption: undefined, captionRegistryEmpty: true },
                h,
              ),
              Parts.Caption(
                { children: ['Stale fallback'] },
                { ...context, caption: undefined, captionRegistryEmpty: false },
                h,
              ),
              Parts.Caption({}, { ...context, caption: [] }, h),
            ],
          ),
        )
        const captions = root.querySelectorAll('[data-ramka-caption]')
        expect(captions[0]?.textContent).toBe('Initial fallback')
        expect(captions[1]?.textContent).toBe('')
        expect(captions[1]?.hasAttribute('data-has-caption')).toBe(false)
        expect(captions[2]?.hasAttribute('data-has-caption')).toBe(true)
      }),
  )
  it.effect(
    'keeps loop controls available for one item and lets native disabled attributes override defaults',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          h.main(
            [],
            [
              Parts.Previous({}, { ...context, count: 1, loop: true }, h),
              Parts.Next({}, { ...context, count: 1, loop: true }, h),
              Parts.Next({ attributes: childAttributes([h.Disabled(true)]) }, context, h),
              Parts.Trigger(
                { index: 0, attributes: childAttributes([h.Disabled(true)]) },
                context,
                h,
              ),
              Parts.Thumbnail(
                { index: 0, attributes: childAttributes([h.Disabled(true)]) },
                context,
                h,
              ),
              Parts.Counter({}, { ...context, count: 0 }, h),
            ],
          ),
        )
        expect(Array.from(root.querySelectorAll('button'), (button) => button.disabled)).toEqual([
          false,
          false,
          true,
          true,
          true,
        ])
        expect(root.querySelector('[data-ramka-counter]')?.textContent).toBe('1 / 0')
      }),
  )
  it.effect('only expands the actual opener and keeps closed trigger context inactive', () =>
    Effect.gen(function* () {
      const root = yield* render((h) =>
        h.main(
          [],
          [
            Parts.Trigger({ index: 0 }, context, h),
            Parts.Trigger({ index: 0, id: 'opener' }, { ...context, openerId: 'opener' }, h),
            Parts.Trigger({ index: 0, id: 'duplicate' }, { ...context, openerId: 'opener' }, h),
          ],
        ),
      )
      expect(
        Array.from(root.querySelectorAll('button'), (button) =>
          button.getAttribute('aria-expanded'),
        ),
      ).toEqual(['false', 'true', 'false'])
      expect(getTriggerContext({ ...context, open: false }, 0)?.active).toBe(false)
    }),
  )
  it.effect('keeps loop-adjacent items mounted and omits distant render callbacks entirely', () =>
    Effect.gen(function* () {
      const root = yield* render((h) =>
        Parts.Slides(
          {
            children: [0, 1, 2, 3, 4].map((index) =>
              Parts.Slide(
                {
                  index,
                  children: [
                    Parts.Item(
                      {
                        index,
                        children: ({ active }) => [active ? 'Current' : 'Neighbour'],
                        render: (attributes, children) => h.article(attributes, children),
                      },
                      { ...context, inSlides: true, loop: true },
                      h,
                    ),
                  ],
                },
                context,
                h,
              ),
            ),
          },
          context,
          h,
        ),
      )
      expect(root.querySelectorAll('[data-ramka-slide]')).toHaveLength(5)
      expect(
        Array.from(root.querySelectorAll('article[data-ramka-item]'), (item) =>
          item.getAttribute('data-index'),
        ),
      ).toEqual(['0', '1', '4'])
    }),
  )
  it.effect.each([false, true])(
    'runs consumer events before internal events through native bindings (custom host: %s)',
    (customHost) =>
      Effect.gen(function* () {
        const layer = Page.makeLayer({
          init: Composition.makeInit(() => ({ model: { events: [] } })),
          update: Composition.makeUpdate({
            Noop: Page.makeNoopStep(),
            Recorded: (model, { name }) => ({ model: { events: [...model.events, name] } }),
          }),
          view: Composition.makeView((model, h) => ({
            title: 'Events',
            body: h.main(
              [],
              [
                Parts.Close(
                  {
                    children: ['Close'],
                    attributes: childAttributes([
                      h.OnClick(Message.Recorded({ name: 'consumer' })),
                    ]),
                    ...(customHost
                      ? {
                          render: (
                            attributes: Parts.PartAttributes,
                            children: Parts.PartChildren,
                          ) => h.button(attributes, children),
                        }
                      : {}),
                  },
                  {
                    ...context,
                    close: childAttributes([h.OnClick(Message.Recorded({ name: 'internal' }))]),
                  },
                  h,
                ),
                h.output([], [model.events.join(',')]),
              ],
            ),
          })),
        })
        yield* Scene.scene(
          { block: Page, layer },
          Scene.init(),
          Scene.click(Scene.role('button', { name: 'Close' })),
          Scene.expect(Scene.selector('output')).toHaveText('consumer,internal'),
        )
      }),
  )
  it.effect(
    'keeps closing content modal and parks retained closed content outside focus and accessibility',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          h.main(
            [],
            [
              Parts.Content({}, { ...context, open: false, parked: false }, h),
              Parts.Content({}, { ...context, open: false, parked: true }, h),
              Parts.Backdrop({}, { ...context, open: false, parked: false }, h),
              Parts.Backdrop({}, { ...context, open: false, parked: true }, h),
            ],
          ),
        )
        const content = root.querySelectorAll('dialog')
        expect(content[0]?.getAttribute('aria-modal')).toBe('true')
        expect(content[0]?.hasAttribute('aria-hidden')).toBe(false)
        expect(content[0]?.getAttribute('tabindex')).toBe('-1')
        expect(content[0]?.hasAttribute('inert')).toBe(false)
        expect(content[1]?.hasAttribute('aria-modal')).toBe(false)
        expect(content[1]?.getAttribute('aria-hidden')).toBe('true')
        expect(content[1]?.hasAttribute('tabindex')).toBe(false)
        expect(content[1]?.hasAttribute('inert')).toBe(true)
        expect(content[0]?.style.visibility).toBe('')
        expect(content[1]?.style.visibility).toBe('hidden')
        expect(content[1]?.style.pointerEvents).toBe('none')
        expect(
          Array.from(root.querySelectorAll('[data-ramka-backdrop]'), (node) =>
            node.hasAttribute('inert'),
          ),
        ).toEqual([false, true])
      }),
  )
  it.effect(
    'stamps custom-id active triggers on the server before morph targets can register',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          h.main(
            [],
            [
              Parts.Trigger(
                { index: 0, id: 'hero' },
                { ...context, ssr: true, morphTo: 'closest' },
                h,
              ),
              Parts.Trigger(
                { index: 0, id: 'origin' },
                { ...context, ssr: true, morphTo: 'origin' },
                h,
              ),
              Parts.Trigger(
                { index: 1, id: 'neighbour' },
                { ...context, ssr: true, morphTo: 'active' },
                h,
              ),
            ],
          ),
        )
        expect(
          Array.from(root.querySelectorAll('button'), (button) =>
            button.hasAttribute('data-morph-target'),
          ),
        ).toEqual([true, false, false])
      }),
  )
  it.effect('exposes per-item media bridge state to custom render hosts', () =>
    Effect.gen(function* () {
      const root = yield* render((h) =>
        h.main(
          [],
          [0, 1].map((index) =>
            Parts.Media(
              {
                index,
                render: (attributes, children, state) =>
                  h.figure(
                    [...attributes, h.Attribute('data-bridging', String(state.placeholder))],
                    children,
                  ),
              },
              { ...context, placeholderIndices: [1] },
              h,
            ),
          ),
        ),
      )
      const media = root.querySelectorAll('figure')
      expect(Array.from(media, (element) => element.getAttribute('data-bridging'))).toEqual([
        'false',
        'true',
      ])
      expect(Array.from(media, (element) => element.hasAttribute('data-placeholder'))).toEqual([
        false,
        true,
      ])
    }),
  )
  it.effect(
    'preserves both class sources and exposes scaled state independently of a custom minimum zoom',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          Parts.Zoom(
            {
              attributes: childAttributes([h.Class('consumer')]),
            },
            {
              ...context,
              minZoom: 2,
              zoom: 2,
              zoomAttributes: childAttributes([h.Class('internal')]),
            },
            h,
          ),
        )
        const zoom = root.querySelector<HTMLElement>('[data-ramka-zoom]')
        expect(zoom?.className).toBe('consumer internal')
        expect(zoom?.hasAttribute('data-zoom')).toBe(true)
        expect(zoom?.style.touchAction).toBe('pan-x pan-y')
      }),
  )
  it.effect(
    'normalizes short-range zoom chrome and holds it through the final zoom-out frame',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          h.main(
            [],
            [
              Parts.Content({}, { ...context, maxZoom: 1.5, zoom: 1.25 }, h),
              Parts.Content({}, { ...context, zoom: 1, zoomAnimationTarget: 2 }, h),
              Parts.Content({}, { ...context, zoom: 1, zoomAnimationTarget: 1 }, h),
              Parts.Content({}, { ...context, zoom: 1 }, h),
            ],
          ),
        )
        const content = root.querySelectorAll('dialog')
        expect(
          Array.from(content, (node) => node.style.getPropertyValue('--lightbox-zoom-progress')),
        ).toEqual(['0.5', '0', '0', ''])
        expect(Array.from(content, (node) => node.hasAttribute('data-zoomed'))).toEqual([
          true,
          true,
          true,
          false,
        ])
      }),
  )
  it.effect(
    'publishes committed zoom controls and render state while painting the sampled physical pose',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) => {
          const animating = {
            ...context,
            zoom: 1.25,
            x: 2,
            y: -3,
            zoomAnimationTarget: 4,
            zoomAnimationX: 20,
            zoomAnimationY: -30,
          }
          return h.main(
            [],
            [
              Parts.Zoom(
                {
                  render: (attributes, children, state) =>
                    h.section(
                      [
                        ...attributes,
                        h.Attribute('data-pose', `${state.zoom}/${state.offsetX}/${state.offsetY}`),
                      ],
                      children,
                    ),
                },
                animating,
                h,
              ),
              Parts.ZoomIn({}, animating, h),
              Parts.ZoomOut({}, animating, h),
            ],
          )
        })
        const zoom = root.querySelector<HTMLElement>('section')
        expect(zoom?.getAttribute('data-pose')).toBe('4/20/-30')
        expect(zoom?.style.touchAction).toBe('none')
        expect(zoom?.querySelector<HTMLElement>('[data-lightbox-transform]')?.style.transform).toBe(
          'scale(1.25) translate(2px, -3px)',
        )
        expect(Array.from(root.querySelectorAll('button'), (button) => button.disabled)).toEqual([
          true,
          false,
        ])
      }),
  )
  it.effect('renders inactive preloaded Zoom surfaces at their own per-item resting limits', () =>
    Effect.gen(function* () {
      const root = yield* render((h) =>
        h.main(
          [],
          [0, 1].map((index) =>
            Parts.Zoom(
              {
                index,
                render: (attributes, children, state) =>
                  h.section(
                    [...attributes, h.Attribute('data-limits', `${state.zoom}/${state.maxZoom}`)],
                    children,
                  ),
              },
              {
                ...context,
                zoom: 3,
                minZoom: 2,
                maxZoom: 5,
                zoomBounds: [
                  { minZoom: 2, maxZoom: 5 },
                  { minZoom: 0.5, maxZoom: 1.5 },
                ],
              },
              h,
            ),
          ),
        ),
      )
      expect(
        Array.from(root.querySelectorAll('section'), (node) => node.getAttribute('data-limits')),
      ).toEqual(['3/5', '0.5/1.5'])
      expect(
        root.querySelectorAll<HTMLElement>('[data-lightbox-transform]')[1]?.style.transform,
      ).toBe('scale(0.5) translate(0px, 0px)')
    }),
  )
  it.effect(
    'resolves origin and closest trigger context by index while exact opener ARIA stays independent',
    () =>
      Effect.gen(function* () {
        const root = yield* render((h) =>
          h.main(
            [],
            [
              Parts.Trigger(
                {
                  index: 0,
                  id: 'origin-copy',
                  render: (attributes, children, state) =>
                    h.button(
                      [...attributes, h.Attribute('data-target', String(state.morphTarget))],
                      children,
                    ),
                },
                {
                  ...context,
                  index: 3,
                  morphTo: 'origin',
                  openerIndex: 0,
                  openerId: 'actual-opener',
                },
                h,
              ),
              Parts.Trigger(
                {
                  index: 3,
                  render: (attributes, children, state) =>
                    h.button(
                      [...attributes, h.Attribute('data-target', String(state.morphTarget))],
                      children,
                    ),
                },
                { ...context, index: 3, morphTo: 'closest' },
                h,
              ),
            ],
          ),
        )
        const triggers = root.querySelectorAll('button')
        expect(triggers[0]?.getAttribute('data-target')).toBe('true')
        expect(triggers[0]?.getAttribute('aria-expanded')).toBe('false')
        expect(triggers[1]?.getAttribute('data-target')).toBe('false')
        expect(
          getTriggerContext({ ...context, morphTo: 'closest', morphTargetIndex: 4 }, 4)
            ?.morphTarget,
        ).toBe(true)
      }),
  )
  it.effect('keeps prepared chrome hidden and closed until the reveal projection opens it', () =>
    Effect.gen(function* () {
      const root = yield* render((h) =>
        h.main(
          [],
          [false, true].map((revealed) => {
            const projected = {
              ...context,
              open: revealed,
              parked: false,
              preparing: !revealed,
              openerId: 'prepared-trigger',
            }
            return h.section(
              [h.Attribute('data-phase', revealed ? 'revealed' : 'preparing')],
              [
                Parts.Trigger({ index: 0, id: 'prepared-trigger' }, projected, h),
                Parts.Portal(
                  { children: [Parts.Backdrop({}, projected, h), Parts.Content({}, projected, h)] },
                  projected,
                  h,
                ),
              ],
            )
          }),
        ),
      )
      for (const selector of [
        '[data-ramka-portal]',
        '[data-ramka-backdrop]',
        '[data-ramka-content]',
      ]) {
        const prepared = root.querySelector<HTMLElement>(`[data-phase="preparing"] ${selector}`)
        const revealed = root.querySelector<HTMLElement>(`[data-phase="revealed"] ${selector}`)
        expect(prepared?.style.visibility).toBe('hidden')
        expect(prepared?.style.pointerEvents).toBe('none')
        expect(revealed?.style.visibility).toBe('')
        expect(revealed?.style.pointerEvents).toBe('')
      }
      const prepared = root.querySelector('[data-phase="preparing"]')
      expect(prepared?.querySelector('[data-open]')).toBeNull()
      expect(prepared?.querySelector('[data-ramka-content]')?.getAttribute('aria-modal')).toBe(
        'true',
      )
      expect(prepared?.querySelector('[data-ramka-trigger]')?.getAttribute('aria-expanded')).toBe(
        'false',
      )
      expect(prepared?.querySelector('[data-ramka-trigger]')?.hasAttribute('data-active')).toBe(
        false,
      )
      const revealed = root.querySelector('[data-phase="revealed"]')
      expect(revealed?.querySelectorAll('[data-open]')).toHaveLength(2)
      expect(revealed?.querySelector('[data-ramka-trigger]')?.getAttribute('aria-expanded')).toBe(
        'true',
      )
    }),
  )
})
