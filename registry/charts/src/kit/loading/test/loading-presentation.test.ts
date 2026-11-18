import { Effect, Predicate, Schema } from 'effect'
import { Block } from 'foldkit'
import { inertHtml } from 'foldkit/html'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { renderToString } from 'foldkit/experimental/server'
import { it as effectIt } from '@effect/vitest'
import { expect, it } from 'vitest'
import { Window } from 'happy-dom'
import type { HTMLElement, SVGElement } from 'happy-dom'
import { ChartLoadingLabel } from '../label-view'
import { ChartRevealClip } from '../reveal-view'
import { curveLinear } from 'd3-shape'
import { lineSweepPaths, barSkeletonRects } from '../sweep-geometry'

export const LoadingPresentationContractKey = Symbol('LoadingPresentationContract')

const Probe = Block.make('LoadingPresentationContract', {
  key: LoadingPresentationContractKey,
  Model: Schema.Struct({}),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Composition = Probe.makeComposition({})

const renderOwned = (presentation: (h: HtmlBuilder<never>) => Html) => {
  const layer = Probe.makeLayer({
    init: Composition.makeInit(() => ({ model: {} })),
    update: Composition.makeUpdate({}),
    view: Composition.makeView((_model, h) => ({
      title: 'Loading presentation',
      body: presentation(h),
    })),
  })

  return renderToString({ block: Probe, layer }, {}, { isHydratable: false })
}

const vnodeDescendants: (node: Html) => ReadonlyArray<NonNullable<Html>> = (node: Html) =>
  node === null
    ? []
    : [
        node,
        ...(node.children ?? []).flatMap((child) =>
          Predicate.isString(child) ? [] : vnodeDescendants(child),
        ),
      ]

const vnodeText: (node: NonNullable<Html>) => string = (node: NonNullable<Html>) =>
  node.text ??
  (node.children ?? [])
    .map((child) => (Predicate.isString(child) ? child : (child.text ?? '')))
    .join('')

it('retains Source astral UTF-16 units and their independent animation delays in real native VNodes', () => {
  const nodes = vnodeDescendants(ChartLoadingLabel(inertHtml, { text: 'A😀B' }))

  const characters = nodes.filter(
    (node) => node.sel === 'span' && node.data?.attrs?.['aria-hidden'] === 'true',
  )

  expect(characters.map(vnodeText)).toEqual(['A', '\uD83D', '\uDE00', 'B'])
  expect(characters.map((node) => node.data?.style?.['--bkm-label-delay'])).toEqual([
    '0s',
    '0.25s',
    '0.5s',
    '0.75s',
  ])
  expect(
    characters.every(
      (node) => node.data?.style?.['--bkm-label-animation'] === 'bkm-label-char-4 1.2s infinite',
    ),
  ).toBe(true)
  expect(nodes.some((node) => vnodeText(node) === 'A😀B')).toBe(true)
})

effectIt.effect(
  'retains representable label markup, delays, live region and exit styles through native SSR',
  () =>
    Effect.gen(function* labelContract() {
      const { html } = yield* renderOwned((h) =>
        ChartLoadingLabel(h, { text: 'ABCD', exiting: true }),
      )

      const document = new Window().document
      document.body.innerHTML = html
      const label = document.querySelector('output[aria-live="polite"]')
      const characters = [...(label?.querySelectorAll<HTMLElement>('[aria-hidden="true"]') ?? [])]
      expect(characters.map((character) => character.textContent)).toEqual(['A', 'B', 'C', 'D'])
      expect(
        characters.map((character) => character.style.getPropertyValue('--bkm-label-delay')),
      ).toEqual(['0s', '0.25s', '0.5s', '0.75s'])
      expect(
        characters.every(
          (character) =>
            character.style.getPropertyValue('--bkm-label-animation') ===
            'bkm-label-char-4 1.2s infinite',
        ),
      ).toBe(true)
      expect(label?.hasAttribute('data-exiting')).toBe(true)
      expect(label?.textContent).toContain('ABCD')
    }),
)

effectIt.effect('omits blank labels instead of creating a hidden animation tree', () =>
  Effect.gen(function* blankLabelContract() {
    const { html } = yield* renderOwned((h) => ChartLoadingLabel(h, { text: ' \t\n' }))
    expect(html).not.toContain('loading-label')
    expect(html).not.toContain('@keyframes')
  }),
)

effectIt.effect(
  'renders a static padded clip without animation and preserves negative padded height',
  () =>
    Effect.gen(function* staticClipContract() {
      const { html } = yield* renderOwned((h) =>
        h.svg(
          [],
          [
            ChartRevealClip(h, {
              clipPathId: 'static',
              height: -20,
              targetWidth: 10,
              padding: 2,
              revealEpoch: 0,
              animating: false,
            }),
          ],
        ),
      )

      expect(html).toContain('width="14"')
      expect(html).toContain('height="-16"')
      expect(html).toContain('x="-2"')
      expect(html).toContain('y="-2"')
      expect(html).not.toContain('animation:')
    }),
)

effectIt.effect(
  'uses tween timing while retaining numeric spring duration and fallback easing',
  () =>
    Effect.gen(function* clipTimingContract() {
      const { html } = yield* renderOwned((h) =>
        h.svg(
          [],
          [
            ChartRevealClip(h, {
              clipPathId: 'tween',
              height: 50,
              targetWidth: -10,
              padding: 2,
              revealEpoch: 1,
              enterTransition: { type: 'tween', ease: [0.1, 0.2, 0.3, 0.4] },
            }),
            ChartRevealClip(h, {
              clipPathId: 'spring',
              height: 50,
              targetWidth: 20,
              revealEpoch: 1,
              mode: 'conceal',
              enterTransition: { type: 'spring', duration: 0.7, ease: 'linear' },
            }),
          ],
        ),
      )

      expect(html).toContain('--bkm-clip-w:0px')
      const document = new Window().document
      document.body.innerHTML = html
      const tween = document.querySelector<SVGElement>('#tween rect')?.style
      const spring = document.querySelector<SVGElement>('#spring rect')?.style
      expect(tween?.getPropertyValue('--bkm-clip-duration')).toBe('0.3s')
      expect(tween?.getPropertyValue('--bkm-clip-ease')).toBe('cubic-bezier(0.1,0.2,0.3,0.4)')
      expect(spring?.getPropertyValue('--bkm-clip-duration')).toBe('0.7s')
      expect(spring?.getPropertyValue('--bkm-clip-ease')).toBe('cubic-bezier(0.85,0,0.15,1)')
    }),
)

it('retains Source linear silhouette and baseline geometry without normalizing caller options', () => {
  expect(lineSweepPaths(curveLinear, 100, 100, 2, 0)).toEqual({
    line: 'M0,25L100,77',
    area: 'M0,25L100,77L100,100L0,100Z',
  })
  expect(lineSweepPaths(curveLinear, 100, 100, 1, 0)).toBeNull()
  expect(lineSweepPaths(curveLinear, 0, 100, 2, 0)).toBeNull()
  expect(
    barSkeletonRects({ innerWidth: 100, innerHeight: 100, barCount: 1, barFraction: 1 }, 0),
  ).toEqual([{ key: '0.00-75', width: 100, height: 75, x: 0, y: 25 }])
  expect(barSkeletonRects({ innerWidth: 100, innerHeight: 100, barCount: 0 }, 0)).toEqual([])
})
