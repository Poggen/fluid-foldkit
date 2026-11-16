import { SunburstChart, SunburstSegment, SunburstLabels } from './index'
import type { SunburstChartProps } from './props'
import { sunburstPlan, sunburstResources, buildDefinition } from './build'
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Block, Story } from 'foldkit'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { defineChart } from '@tanstack/charts/scene'
import { motion } from '@tanstack/charts/motion'
import { resolveChartRenderer } from '@tanstack/charts/renderer'
import { createSectorFeed, createSectorLayer } from './sunburst-layer'
import { sectorPath } from './geometry'

it('routes a sector scene through its custom renderer after adding portable SSR', () => {
  const feed = createSectorFeed(440)
  const arc = [-Math.PI / 2, Math.PI / 2, 50, 100] satisfies [number, number, number, number]
  feed.geometry.set('sector', { arc, delayMs: 0 })
  const layer = createSectorLayer(feed, { current: null }, () => 0)
  const paint = layer.prerender
  let calls = 0
  layer.prerender = (scene, options) => {
    calls += 1
    return paint(scene, options)
  }
  const runtime = createChartRuntime()
  try {
    const empty = runtime.render(defineChart({ marks: [], scales: { x: null, y: null } }), {
      width: 440,
      height: 440,
    })
    const scene = {
      ...empty,
      nodes: [
        {
          kind: 'group',
          key: 'sectors',
          renderer: layer,
          children: [{ kind: 'area', key: 'sector', path: 'M0,0', points: [] }],
        } satisfies import('@tanstack/charts').SceneNode,
      ],
    }
    const defaultRenderer = motion()
    const composed = resolveChartRenderer(scene, defaultRenderer)
    // Renderer identity is the public host's resource lifetime: changing it remounts every layer on update.
    expect(resolveChartRenderer(scene, defaultRenderer)).toBe(composed)
    const output = composed.prerender(scene, { ariaLabel: 'Sector' })
    expect(calls).toBe(1)
    expect(output).toContain(`d="${sectorPath(arc)}"`)
    expect(output).not.toContain('d="M0,0"')
  } finally {
    runtime.destroy()
  }
})

it.effect(
  'paints each data arc once with the last Segment override while labels retain the full hierarchy',
  () =>
    Effect.gen(function* () {
      const chart = SunburstChart({ name: 'sunburst-authored-renderer' })
      const Key = Symbol('AuthoredSunburst')
      const Definition = Block.make(chart.namespace, { ...chart.contract, key: Key })
      const initial = yield* Story.story(
        { block: Definition, layer: Definition.makeLayer(chart.plans<typeof Key>(Definition)) },
        Story.init('authored'),
      )
      const data = {
        name: 'Root',
        children: [
          { name: 'A', value: 30 },
          { name: 'B', value: 70 },
        ],
      }
      for (const [children, labels] of [
        [[], false],
        [
          [
            SunburstSegment({ index: 0, fill: 'red' }),
            SunburstSegment({ index: 0, fill: 'blue' }),
            SunburstLabels(),
          ],
          true,
        ],
      ] satisfies ReadonlyArray<[SunburstChartProps['children'], boolean]>) {
        const plan = sunburstPlan({ data, children }, initial)
        const resources = sunburstResources(plan.size, () => 0)
        const runtime = createChartRuntime()
        try {
          const definition = buildDefinition({
            ...plan,
            ...resources,
            now: () => 0,
            enterStaggerScale: 1,
            enterTransition: undefined,
            isIntro: () => false,
            center: () => null,
            controlled: false,
            introAt: () => null,
            scene: () => null,
            noteSource: () => undefined,
            moving: () => false,
            hoveredId: () => null,
          })
          const scene = runtime.render(definition, { width: 520, height: 520 })
          const svg = resolveChartRenderer(scene, motion()).prerender(scene, {
            ariaLabel: 'Authored roles',
          })
          expect(svg.match(/class="[^"]*\bbk-sb-a0\b/g)?.length ?? 0).toBe(1)
          expect(svg.match(/class="[^"]*\bbk-sb-a1\b/g)?.length ?? 0).toBe(1)
          if (labels) {
            expect(svg).not.toContain('fill="red"')
            expect(svg).toContain('fill="blue"')
            expect(svg).toContain('>B</text>')
          }
          expect(plan.model.arcs.map((arc) => arc.value)).toEqual([30, 70])
        } finally {
          runtime.destroy()
        }
      }
    }),
)
