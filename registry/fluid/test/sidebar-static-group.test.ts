// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { expect } from 'vitest'
import { SidebarGroup } from '@foldkit-visuals/fluid/sidebar/parts'

const key = Symbol('SidebarStaticGroup')
const effects = Block.makeEffectsContract()
const Root = Block.make('SidebarStaticGroup', {
  key,
  Model: Schema.Struct({}),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Document' },
})
const Composition = Root.makeComposition()
const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((_model, h) => ({
    title: 'Static sidebar group',
    body: SidebarGroup(
      {
        className: 'pages-group',
        children: [
          h.ul([], [h.li([], [h.a([h.Href('/docs/introduction')], ['Introduction'])])]),
          h.p([], ['Getting started']),
        ],
      },
      h,
    ),
  })),
})

it.effect('an unlabeled public SidebarGroup renders its children without collapse controls', () =>
  Effect.gen(function* () {
    const { html } = yield* renderToString({ block: Root, layer }, {}, { isHydratable: false })
    const container = document.createElement('div')
    container.innerHTML = html
    const group = container.querySelector('[data-sidebar="group"]')

    expect(group?.classList.contains('pages-group')).toBe(true)
    expect(group?.children).toHaveLength(2)
    expect(group?.firstElementChild?.tagName).toBe('UL')
    expect(group?.querySelector('a')?.getAttribute('href')).toBe('/docs/introduction')
    expect(group?.querySelector('a')?.textContent).toBe('Introduction')
    expect(group?.lastElementChild?.textContent).toBe('Getting started')
    expect(
      group?.querySelector('button, [data-sidebar="group-label"], [aria-expanded], [aria-hidden]'),
    ).toBeNull()
    expect(group?.hasAttribute('data-state')).toBe(false)
  }),
)
