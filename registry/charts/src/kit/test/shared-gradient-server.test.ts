import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import type { ChartGradient } from '@tanstack/charts'
import { gradientResourceView, scopedGradientId } from '../gradient-resources'

export const GradientResourceServerContractKey = Symbol('GradientResourceServerContract')

const Probe = Block.make('GradientResourceServerContract', {
  key: GradientResourceServerContractKey,
  Model: Schema.Struct({}),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Composition = Probe.makeComposition({})

const renderResources = (gradients: ReadonlyArray<ChartGradient>, prefix: string) => {
  const layer = Probe.makeLayer({
    init: Composition.makeInit(() => ({ model: {} })),
    update: Composition.makeUpdate({}),
    view: Composition.makeView((_model, h) => ({
      title: 'Gradient resource contract',
      body: h.svg([], [gradientResourceView(gradients, prefix)]),
    })),
  })

  return renderToString({ block: Probe, layer }, {}, { isHydratable: false })
}

it.effect('server gradient stops retain declaration order while offsets clamp monotonically', () =>
  Effect.gen(function* gradientStopsContract() {
    const { html } = yield* renderResources(
      [
        {
          id: 'paint',
          type: 'linear',
          stops: [
            { offset: 0.8, color: 'red' },
            { offset: 0.2, color: 'blue' },
            { offset: Number.NaN, color: 'green' },
            { offset: 1.7, color: 'black' },
          ],
        },
      ],
      ':chart.1:',
    )

    expect(html).toContain('id="chart1-paint"')
    expect(html.match(/offset="80%"/gu)).toHaveLength(3)
    expect(html).toContain('offset="100%"')
    expect(html.indexOf('stop-color="red"')).toBeLessThan(html.indexOf('stop-color="blue"'))
    expect(html.indexOf('stop-color="blue"')).toBeLessThan(html.indexOf('stop-color="green"'))
    expect(html).toContain('x1="0%"')
    expect(html).toContain('y1="100%"')
  }),
)

it.effect(
  'server radial coordinates use native defaults and clamping without inventing an empty id prefix',
  () =>
    Effect.gen(function* radialCoordinatesContract() {
      const { html } = yield* renderResources(
        [
          {
            id: 'radial',
            type: 'radial',
            cx: -1,
            cy: Number.POSITIVE_INFINITY,
            r: 2,
            stops: [{ offset: 0, color: 'red' }],
          },
        ],
        '',
      )

      expect(html).toContain('id="radial"')
      expect(html).toContain('cx="0%"')
      expect(html).toContain('cy="100%"')
      expect(html).toContain('r="100%"')
      expect(html).toContain('fx="0%"')
      expect(html).toContain('fy="100%"')
      expect(scopedGradientId(':chart.1:', 'paint')).toBe('chart1-paint')
    }),
)
