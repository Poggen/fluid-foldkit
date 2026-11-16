import { Effect, Layer, Schema } from 'effect'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { Window } from 'happy-dom'
import { Bar, BarSquares, BarPulse, BarXAxis, YAxis } from '../src/index'
import type { BarChartProps } from '../src/bar/options'

import type { Row } from './bar-geometry-subject'
import { data, recipe, Chart, subject, props, draw, front, flatten } from './bar-geometry-subject'

it.effect(
  'one Bar owner applies independent vertical scales while retaining global series slots and stack offsets',
  () =>
    Story.withBlock(subject, (owner) => {
      const grouped = draw(owner)
      expect(grouped.snapshot.valueDomains).toEqual({ left: [0, 45], right: [0, 4500] })
      expect(grouped.scene.scales.y?.domain).toEqual([0, 45])
      expect(grouped.scene.scales['y:right']?.domain).toEqual([0, 4500])
      const numeric = flatten(grouped.scene.nodes)
        .filter((node) => node.kind === 'label')
        .filter((label) => label.text.startsWith('$'))
      expect(numeric.map((label) => label.text)).toEqual(['$0', '$2000', '$4000'])
      for (const [index, label] of numeric.entries()) {
        expect(label.x).toBe(404)
        expect(label.anchor).toBe('start')
        expect(label.baseline).toBe('middle')
        expect(label.y).toBeCloseTo(400 * (1 - (index * 2000) / 4500), 10)
      }

      const rectangles = flatten(grouped.scene.nodes).filter(
        (node) => node.kind === 'rect' && node.key.startsWith('bars:'),
      )

      expect(rectangles.map((node) => (node.kind === 'rect' ? node.width : 0))).toEqual([
        98, 98, 98, 98,
      ])
      expect(grouped.scene.points.map((point) => point.datum.source)).toEqual([
        data[0],
        data[0],
        data[1],
        data[1],
      ])
      expect(grouped.scene.points[0]?.y).toBeCloseTo(400 * (1 - 20 / 45), 10)
      expect(grouped.scene.points[1]?.y).toBeCloseTo(400 * (1 - 2000 / 4500), 10)
      const stacked = draw(owner, { ...props, stacked: true })
      expect(stacked.snapshot.valueDomains).toEqual(grouped.snapshot.valueDomains)
      expect(stacked.scene.points[1]?.y).toBeCloseTo(400 * (1 - 2020 / 4500), 10)

      const rounded = draw(owner, {
        ...props,
        stacked: true,
        children: [Bar({ dataKey: 'a' }), Bar({ dataKey: 'b', yAxisId: 'right' })],
      })

      const upper = flatten(rounded.scene.nodes).find((node) => node.key === 'bars:0:b')

      if (upper?.kind !== 'rect') {
        throw new Error('Expected the stacked upper rectangle')
      }

      expect(front(rounded.scene, 'bars:0:a').radius).toBe(0)
      expect(upper.radius).toBe(8)
      expect(upper.cornerRadii).toBeUndefined()
      const horizontal = draw(owner, { ...props, orientation: 'horizontal' })
      expect(horizontal.snapshot.valueDomains).toEqual({ left: [0, 4500] })
      expect(horizontal.scene.scales['y:right']).toBeUndefined()
      const horizontalLabels = flatten(horizontal.scene.nodes)
        .filter((node) => node.kind === 'label')
        .filter((label) => label.text.startsWith('$'))
      expect(horizontalLabels.map((label) => label.text)).toEqual(['$0', '$2000', '$4000'])
      for (const [index, label] of horizontalLabels.entries()) {
        expect(label.y).toBeCloseTo((400 * index * 2000) / 4500, 10)
        expect(label.x).toBe(404)
        expect(label.anchor).toBe('start')
      }

      const secondaryOnly = draw(owner, { ...props, children: [Bar({ dataKey: 'a', yAxisId: 0 })] })
      expect(secondaryOnly.snapshot.valueDomains).toEqual({ '0': [0, 45], left: [0, 100] })
      expect(secondaryOnly.scene.points[0]?.y).toBeCloseTo(400 * (1 - 20 / 45), 10)
    }),
)

export const BarAxesParentKey = Symbol('BarAxesParent')

const Parent = Block.make('BarAxesParent', {
  key: BarAxesParentKey,
  Model: Schema.Struct({ chart: Chart.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Binding = Parent.makeRequiredFieldBinding(Chart, {
  field: 'chart',
  init: { contextToArgs: () => ['bar-axis-paints', data, recipe.configuration(props)] },
})

const Composition = Parent.makeComposition({ bindings: [Binding] })

const assertPulseClip = (html: string, browser: Window, diagnostic: string) => {
  const fragments = html.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/gu) ?? []
  expect(fragments.length).toBeGreaterThan(0)

  const pulseDocument = new browser.DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${fragments.join('')}</svg>`,
    'image/svg+xml',
  )

  expect(pulseDocument.querySelector('parsererror')).toBeNull()
  expect(pulseDocument.documentElement.firstElementChild?.namespaceURI).toBe(
    'http://www.w3.org/2000/svg',
  )
  expect(
    pulseDocument.querySelectorAll('clipPath[id*="pulse-clip"] path'),
    diagnostic,
  ).toHaveLength(1)
  const pulse = browser.document.querySelector('g.bkm-pulse-0-0')

  if (!(pulse instanceof browser.SVGElement)) {
    throw new Error('Expected the real SVG pulse group')
  }

  const sheet = new browser.CSSStyleSheet()
  sheet.replaceSync(
    [...pulseDocument.querySelectorAll('style')].map((style) => style.textContent).join('\n'),
  )

  const clipRule = [...sheet.cssRules].find(
    (rule) =>
      rule instanceof browser.CSSStyleRule &&
      rule.style.getPropertyValue('--bkm-pulse-clip') !== '' &&
      pulse.matches(rule.selectorText),
  )

  if (!(clipRule instanceof browser.CSSStyleRule)) {
    throw new Error('Expected the authored pulse clipping rule to match its group')
  }

  expect(clipRule.style.getPropertyValue('--bkm-pulse-clip')).toContain('pulse-clip-0-0')

  return pulseDocument
}

it.effect(
  'mixed Bar/Squares gradients use the same secondary scale and measured margin as their column',
  () =>
    Effect.gen(function* mixedAxisPaints() {
      const mixed: BarChartProps<typeof Row.Type> = {
        ...props,
        barWidth: 18,
        margin: { top: 20, bottom: 30, left: 0, right: 0 },
        children: [
          Bar({ dataKey: 'a' }),
          BarPulse({ dataKey: 'a', activeIndex: 0 }),
          BarXAxis(),
          YAxis({
            yAxisId: 'right',
            orientation: 'right',
            numTicks: 3,
            formatValue: (value) => `<b>${value}</b>`,
          }),
          BarSquares({
            dataKey: 'b',
            yAxisId: 'right',
            useGradient: true,
            animate: false,
            gradientStops: [
              { offset: 0, color: 'red' },
              { offset: 100, color: 'blue' },
            ],
          }),
        ],
      }

      const render = (barWidth: number, focusedIndex: number | null = null) =>
        Story.withBlock(subject, (owner) => {
          const projected = draw(owner, { ...mixed, barWidth })

          const admitted: Array<{
            revealReady: boolean
            phaseClockReady: boolean
            status: string
            activeIndex: number | undefined
            dataLength: number
          }> = []

          const layer = Parent.makeLayer({
            init: Composition.makeInit(() => ({ model: {} })),
            update: Composition.makeUpdate({}),
            view: Composition.makeView((model, h) => {
              const measured = owner.update(
                model.chart,
                owner.Message.ObservedPhaseTiming({
                  generation: model.chart.generation,
                  elapsed: null,
                  at: 0,
                }),
              ).model

              const ready = owner.update(
                measured,
                owner.Message.CompletedReveal({ generation: measured.generation }),
              ).model

              const focused =
                focusedIndex === null
                  ? ready
                  : owner.inMessageUpdate(
                      ready,
                      owner.InMessage.RequestedFocus({ index: focusedIndex }),
                    ).model

              admitted.push({
                revealReady: focused.revealReady,
                phaseClockReady: focused.phaseClockReady,
                status: focused.configuration.status,
                activeIndex: mixed.children.find((child) => child.kind === 'barPulse')?.props
                  .activeIndex,
                dataLength: focused.data.length,
              })

              return {
                title: 'Mixed Bar axes',
                body: h.block(
                  Binding.embedView({
                    slotId: 'chart',
                    model: focused,
                    viewInputs: recipe.inputs('bar-axis-paints', { ...mixed, barWidth }),
                  }),
                ),
              }
            }),
          }).pipe(Layer.provide(subject.layer))

          return renderToString({ block: Parent, layer }, {}, { isHydratable: false }).pipe(
            Effect.map((output) => ({
              ...output,
              pulseDiagnostic: {
                admitted,
                snapshotClipCount: projected.snapshot.pulseClips.length,
                snapshotClipIds: projected.snapshot.pulseClips.map((clip) => clip.id),
                serializedClipTags: output.html.match(/<\/?clipPath\b[^>]*>/giu),
                serializedPulseClasses: output.html.match(/class="[^"]*bkm-pulse[^"]*"/gu),
              },
            })),
          )
        })

      const { html, pulseDiagnostic } = yield* render(18)
      const browser = new Window()
      browser.document.body.innerHTML = html
      const cells = [...browser.document.querySelectorAll('rect[data-ts-key^="squares:b:0:"]')]
      expect(cells.length).toBeGreaterThan(0)
      expect(Number(cells[0]?.getAttribute('width'))).toBe(7)
      expect(Number(cells[0]?.getAttribute('x'))).toBe(11)
      const svgResources = assertPulseClip(html, browser, JSON.stringify(pulseDiagnostic))
      const id = /^url\(#(?<id>[^)]+)\)$/u.exec(cells[0]?.getAttribute('fill') ?? '')?.groups?.id

      if (id === undefined) {
        throw new Error('Expected owned secondary-series gradient')
      }

      const gradient = [...svgResources.querySelectorAll('[id]')].find(
        (element) => element.id === id,
      )

      if (gradient === undefined) {
        throw new Error(
          JSON.stringify({
            expectedGradientId: id,
            serializedGradients: html.match(/<linearGradient\b[^>]*>/gu),
            parsedGradientIds: [...browser.document.querySelectorAll('linearGradient')].map(
              (node) => node.id,
            ),
          }),
        )
      }

      const top = Math.min(...cells.map((cell) => Number(cell.getAttribute('y'))))

      const bottom = Math.max(
        ...cells.map(
          (cell) => Number(cell.getAttribute('y')) + Number(cell.getAttribute('height')),
        ),
      )

      expect(bottom).toBe(370)
      expect(top).toBeGreaterThan(20)
      expect(top).toBeLessThan(370)
      expect(Number(gradient.getAttribute('y1'))).toBe(bottom)
      expect(Number(gradient.getAttribute('y2'))).toBe(top)
      expect(html).toContain('bars:0:a')
      const axis = browser.document.querySelector('[data-ts-key$=":source-y-axes"]')
      const tick = axis?.querySelector('text')
      expect(axis?.namespaceURI).toBe('http://www.w3.org/2000/svg')
      expect(tick?.getAttribute('text-anchor')).toBe('start')
      expect(tick?.getAttribute('dominant-baseline')).toBe('middle')
      const surface = browser.document.querySelector('.bkm-bar-server .ts-chart-surface')
      if (!(surface instanceof browser.HTMLElement))
        throw new Error('Expected the Bar paint viewport')
      const marks = surface.querySelector('.ts-chart__marks')
      if (marks === null) throw new Error('Expected engine marks group')
      expect(axis?.closest('.ts-chart-surface')).toBe(surface)
      expect(axis?.closest('[clip-path]')).toBeNull()
      expect(html).toContain('&lt;b&gt;2000&lt;/b&gt;')
      expect(html).not.toContain('<b>2000</b>')
      expect(browser.document.querySelectorAll('[data-ts-key$=":source-y-axes"]')).toHaveLength(1)
      expect(browser.document.querySelector('.bkm-y-axes')).toBeNull()

      for (const [width, expected] of [
        [0, []],
        [18, [9, 209]],
        [450, [225, 425]],
      ] satisfies ReadonlyArray<readonly [number, ReadonlyArray<number>]>) {
        const output = yield* render(width)
        browser.document.body.innerHTML = output.html

        const labels = [
          ...browser.document.querySelectorAll('[data-bkm-bar-category-x-axis] > div'),
        ]

        expect(
          labels.map((label) => {
            if (!(label instanceof browser.HTMLElement)) {
              throw new Error('Expected Source HTML category label')
            }

            expect(label.closest('.ts-chart-surface')).toBeNull()

            expect(label.style.getPropertyValue('--bkm-category-x')).toMatch(/px$/u)

            return Number(label.style.getPropertyValue('--bkm-category-x').slice(0, -2))
          }),
        ).toEqual(expected)
        expect(
          browser.document.querySelectorAll('text[data-ts-key^="x-tick-label:"]'),
        ).toHaveLength(0)
      }

      const precise = yield* render(18.25)
      browser.document.body.innerHTML = precise.html
      const preciseFront = browser.document.querySelector('rect[data-ts-key="bars:0:a"]')

      if (!(preciseFront instanceof browser.SVGElement)) {
        throw new Error('Expected the actual precise Bar front')
      }

      expect(preciseFront.getAttribute('width')).toBe('7.13')
      expect(
        browser.getComputedStyle(preciseFront).getPropertyValue('--bkm-bar-target-width'),
      ).toBe('7.125px')
      expect(
        browser.getComputedStyle(preciseFront).getPropertyValue('--bkm-bar-current-width'),
      ).toBe('')
      const focused = yield* render(18, 0)
      browser.document.body.innerHTML = focused.html
      const focusedLabel = browser.document.querySelector('[data-bkm-bar-category-x-axis] span')

      if (!(focusedLabel instanceof browser.HTMLElement)) {
        throw new Error('Expected focused Source category label')
      }

      expect(focusedLabel.style.getPropertyValue('--bkm-category-opacity')).toBe('0')
    }),
)
