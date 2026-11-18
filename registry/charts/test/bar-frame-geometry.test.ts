import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Story } from 'foldkit'
import type { SceneNode, SceneGroup } from '@tanstack/charts'
import {
  Bar,
  BarSquares,
  BarColumnTrack,
  BarDepthProvider,
  BarDepthBack,
  BarDepthFront,
  BarPulse,
  BarXAxis,
  BarYAxis,
  ChartTooltip,
} from '../src/index'
import type { BarChartProps } from '../src/bar/options'
import { Row, data, props, draw, front, flatten, subject } from './bar-geometry-subject'

it.effect(
  'minimum floors, explicit perspective and literal per-series corners follow Source independently of a depth provider',
  () =>
    Story.withBlock(subject, (owner) => {
      const rows = [Row.make({ name: 'A', a: 0, b: 100 }), Row.make({ name: 'B', a: 0.01, b: 50 })]
      const floored = draw(
        owner,
        {
          ...props,
          barGap: 0.2,
          children: [
            Bar({ dataKey: 'a', minBarHeight: 5, perspective: true, lineCap: 12, groupGap: 12 }),
            Bar({ dataKey: 'b', lineCap: 3 }),
          ],
        },
        rows,
      )
      expect(front(floored.scene, 'bars:0:a').height).toBe(5)
      expect(front(floored.scene, 'bars:0:a').y).toBe(395)
      expect(front(floored.scene, 'bars:1:a').height).toBe(5)
      expect(front(floored.scene, 'bars:0:a').radius).toBe(0)
      expect(front(floored.scene, 'bars:0:b').radius).toBe(3)
      expect(front(floored.scene, 'bars:0:a').width).toBeLessThan(
        front(floored.scene, 'bars:0:b').width,
      )
      const providerOnly = draw(
        owner,
        {
          ...props,
          children: [
            Bar({ dataKey: 'a', lineCap: 6, stroke: 'magenta' }),
            Bar({ dataKey: 'b' }),
            BarDepthProvider({ minBarHeight: 7 }),
          ],
        },
        rows,
      )
      expect(flatten(providerOnly.scene.nodes).some((node) => node.key === 'bars:0:a')).toBe(false)
      expect(front(providerOnly.scene, 'bars:1:a').height).toBeLessThan(1)
      expect(front(providerOnly.scene, 'bars:1:a').radius).toBe(6)
      expect(front(providerOnly.scene, 'bars:1:a').style?.stroke).toBeUndefined()
      const plain = draw(owner, {
        ...props,
        barGap: 0.2,
        children: [Bar({ dataKey: 'a' }), Bar({ dataKey: 'b', yAxisId: 'right', lineCap: 6 })],
      })
      const perspective = draw(owner, {
        ...props,
        barGap: 0.2,
        children: [
          Bar({ dataKey: 'a', perspective: true }),
          Bar({ dataKey: 'b', yAxisId: 'right', lineCap: 6 }),
        ],
      })
      const rise = front(perspective.scene, 'bars:0:a').y - front(plain.scene, 'bars:0:a').y
      expect(rise).toBeCloseTo(1.4318181818181817, 10)
      expect(
        front(plain.scene, 'bars:0:a').height - front(perspective.scene, 'bars:0:a').height,
      ).toBeCloseTo(rise, 10)
      expect(front(perspective.scene, 'bars:0:a').radius).toBe(0)
      expect(front(perspective.scene, 'bars:0:b')).toEqual(front(plain.scene, 'bars:0:b'))
    }),
)

it.effect(
  'per-Bar stacked gaps shift and trim geometry while chart stackGap only positions tooltip endpoints',
  () =>
    Story.withBlock(subject, (owner) => {
      const rows = [Row.make({ name: 'A', a: 20, b: 10 })]
      const options: BarChartProps<typeof Row.Type> = {
        ...props,
        stacked: true,
        stackGap: 19,
        children: [
          Bar({ dataKey: 'a', stackGap: 3, lineCap: 4 }),
          Bar({ dataKey: 'b', stackGap: 7, lineCap: 10 }),
          ChartTooltip(),
        ],
      }
      const current = draw(owner, options, rows)
      const first = front(current.scene, 'bars:0:a')
      const second = front(current.scene, 'bars:0:b')
      expect(first.y).toBeCloseTo(400 * (1 - 20 / 22), 10)
      expect(first.height).toBeCloseTo((400 * 20) / 22 - 3, 10)
      expect(second.y).toBeCloseTo(400 * (1 - 30 / 22) - 7, 10)
      expect(second.height).toBeCloseTo((400 * 10) / 22, 10)
      expect(first.radius).toBe(4)
      expect(second.radius).toBe(10)
      expect(first.style?.stroke).toBeUndefined()
      const differentTooltipGap = draw(owner, { ...options, stackGap: 0 }, rows)
      expect(front(differentTooltipGap.scene, 'bars:0:a')).toEqual(first)
      expect(front(differentTooltipGap.scene, 'bars:0:b')).toEqual(second)
      const horizontal = draw(owner, { ...options, orientation: 'horizontal' }, rows)
      expect(front(horizontal.scene, 'bars:0:a').width).toBeCloseTo((400 * 20) / 35 - 3, 10)
      expect(front(horizontal.scene, 'bars:0:b').width).toBeCloseTo((400 * 10) / 35, 10)
      expect(front(horizontal.scene, 'bars:0:b').x).toBeCloseTo((400 * 20) / 35 + 7, 10)
    }),
)

it.effect(
  'nonpainting negative and zero fronts retain Source row points without synthesizing provider surfaces',
  () =>
    Story.withBlock(subject, (owner) => {
      const rows = [Row.make({ name: 'A', a: -2, b: 0 })]
      const current = draw(
        owner,
        {
          ...props,
          children: [
            Bar({ dataKey: 'a', minBarHeight: 5, perspective: true, stroke: 'magenta' }),
            Bar({ dataKey: 'b', perspective: true, stroke: 'blue' }),
            BarDepthProvider(),
            ChartTooltip(),
          ],
        },
        rows,
      )
      expect(flatten(current.scene.nodes).filter((node) => node.key.startsWith('bars:'))).toEqual(
        [],
      )
      expect(
        flatten(current.scene.nodes).filter((node) => node.kind === 'rect' || node.kind === 'area'),
      ).toEqual([])
      expect(
        current.scene.points
          .filter((point) => point.markId === 'bars')
          .map((point) => point.datum.source),
      ).toEqual([rows[0], rows[0]])
      expect(current.snapshot.datums.map((datum) => datum.value)).toEqual([-2, 0])
      const requested = draw(
        owner,
        {
          ...props,
          barGap: 0.2,
          children: [
            Bar({ dataKey: 'a', perspective: true, stroke: 'magenta' }),
            BarDepthProvider(),
            BarDepthBack({ dataKey: 'a' }),
          ],
        },
        [Row.make({ name: 'A', a: -2, b: 0 }), Row.make({ name: 'B', a: 20, b: 0 })],
      )
      expect(flatten(requested.scene.nodes).some((node) => node.key === 'bars:0:a')).toBe(false)
      const side = flatten(requested.scene.nodes).find((node) => node.key === 'depth-back:a:0:side')
      if (side?.kind !== 'area') throw new Error('Expected requested Source negative depth side')
      expect(side.points.every((point) => point[1] >= 400)).toBe(true)
      expect(side.points.some((point) => point[1] > 400)).toBe(true)
    }),
)

it.effect(
  'tracks cover ordinary and mixed registered series with their own named scales and skip unsupported layouts',
  () =>
    Story.withBlock(subject, (owner) => {
      const options: BarChartProps<typeof Row.Type> = {
        ...props,
        children: [
          Bar({ dataKey: 'a' }),
          BarSquares({ dataKey: 'b', yAxisId: 'right', animate: false }),
          BarColumnTrack(),
        ],
      }
      const current = draw(owner, options)
      const tracks = flatten(current.scene.nodes).filter((node) => node.key.startsWith('track:'))
      expect(tracks.some((node) => node.key.startsWith('track:a:'))).toBe(true)
      expect(tracks.some((node) => node.key.startsWith('track:b:'))).toBe(true)
      expect(
        current.scene.points
          .filter((point) => point.markId.startsWith('track:'))
          .map((point) => point.datum.source),
      ).toEqual([data[0], data[1], data[0], data[1]])
      for (const changed of [
        { ...options, stacked: true },
        { ...options, orientation: 'horizontal' } satisfies BarChartProps<typeof Row.Type>,
      ]) {
        expect(
          flatten(draw(owner, changed).scene.nodes).some(
            (node) => node.key.startsWith('track:') || node.key.startsWith('squares:'),
          ),
        ).toBe(false)
      }
    }),
)

it.effect(
  'provider depth uses the full category band and primary scale independently of grouped front slots and named axes',
  () =>
    Story.withBlock(subject, (owner) => {
      const current = draw(owner, {
        ...props,
        barGap: 0.2,
        children: [
          Bar({ dataKey: 'a', perspective: true }),
          Bar({ dataKey: 'b', yAxisId: 'right' }),
          BarDepthProvider(),
          BarDepthBack({ dataKey: 'b' }),
        ],
      })
      const lid = flatten(current.scene.nodes).find((node) => node.key === 'depth-back:b:0:lid')
      if (lid?.kind !== 'area') throw new Error('Expected the Source provider lid')
      const first = lid.points[0]
      const second = lid.points[1]
      if (first === undefined || second === undefined) throw new Error('Expected lid front corners')
      expect(second[0] - first[0]).toBeCloseTo((400 * 0.8) / 2.2, 10)
      expect(first[0]).toBeCloseTo((400 * 0.2) / 2.2, 10)
      expect(first[1]).toBeCloseTo(400 * (1 - 2000 / 45) + 1.4318181818181817, 10)
      expect(front(current.scene, 'bars:0:a').width).toBeCloseTo(((400 * 0.8) / 2.2 - 4) / 2, 10)
      const narrow = draw(
        owner,
        { ...props, children: [Bar({ dataKey: 'a' })] },
        Array.from({ length: 80 }, (_, index) => Row.make({ name: String(index), a: 20, b: 0 })),
      )
      expect(front(narrow.scene, 'bars:0:a').radius).toBe(2.5)
    }),
)

const groups: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneGroup> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((node) => (node.kind === 'group' ? [node, ...groups(node.children)] : []))

it.effect(
  'authored band width keeps natural starts and step while fronts, labels and tooltip centers use the same override',
  () =>
    Story.withBlock(subject, (owner) => {
      const options: BarChartProps<typeof Row.Type> = {
        ...props,
        barWidth: 18,
        children: [...props.children, BarXAxis()],
      }
      const current = draw(owner, options)
      expect(current.snapshot.bandWidth).toBe(18)
      expect(current.snapshot.valueDomains).toEqual(draw(owner).snapshot.valueDomains)
      expect(front(current.scene, 'bars:0:a').x).toBe(0)
      expect(front(current.scene, 'bars:0:a').width).toBe(7)
      expect(front(current.scene, 'bars:0:b').x).toBe(11)
      expect(front(current.scene, 'bars:1:a').x).toBe(200)
      expect(current.snapshot.labelXs).toEqual([9, 209])
      expect(
        flatten(current.scene.nodes).filter(
          (node) => node.kind === 'label' && node.key.startsWith('x-tick-label:'),
        ),
      ).toEqual([])
      const plot = {
        height: 400,
        innerWidth: 400,
        innerHeight: 400,
        xDomain: [0, 1] satisfies readonly [number, number],
        yDomains: { y: [0, 45], 'y:right': [0, 4500] } satisfies Readonly<
          Record<string, readonly [number, number]>
        >,
      }
      expect(current.snapshot.overlay?.xOf?.(0, plot)).toBe(9)
      const row = data[0]
      if (row === undefined) throw new Error('Expected original row')
      expect(current.snapshot.overlay?.dots[0]?.at?.(row, plot, 0)?.dx).toBe(-5.5)
      const horizontal = draw(owner, { ...options, orientation: 'horizontal' })
      expect(front(horizontal.scene, 'bars:0:a').y).toBe(0)
      expect(front(horizontal.scene, 'bars:0:a').height).toBe(7)
      expect(front(horizontal.scene, 'bars:0:b').y).toBe(11)
      const stacked = draw(owner, { ...options, stacked: true })
      expect(front(stacked.scene, 'bars:0:a').width).toBe(18)
      expect(front(stacked.scene, 'bars:0:b').width).toBe(18)
      const mixed = draw(owner, {
        ...options,
        children: [
          Bar({ dataKey: 'a' }),
          BarSquares({ dataKey: 'b', yAxisId: 'right', animate: false }),
          BarColumnTrack(),
        ],
      })
      const square = flatten(mixed.scene.nodes).find((node) => node.key === 'squares:b:0:sq0')
      if (square?.kind !== 'rect') throw new Error('Expected authored-width square')
      expect(square.x).toBe(11)
      expect(square.width).toBe(7)
      expect(front(mixed.scene, 'track:a:0:sq0').x).toBe(0)
      expect(front(mixed.scene, 'track:b:0:sq0').x).toBe(11)
    }),
)

it.effect(
  'provider segments and pulse silhouette share one original-row frame with the authored width and primary scale',
  () =>
    Story.withBlock(subject, (owner) => {
      const seen: Array<typeof Row.Type> = []
      const options: BarChartProps<typeof Row.Type> = {
        ...props,
        barWidth: 18,
        children: [
          Bar({ dataKey: 'a' }),
          Bar({ dataKey: 'b', yAxisId: 'right' }),
          BarDepthProvider({
            segmentsAccessor: (row) => {
              seen.push(row)
              return [
                { value: 10, color: 'red' },
                { value: 0, color: 'green' },
                { value: row.a - 10, color: 'blue' },
              ]
            },
          }),
          BarDepthBack({ dataKey: 'a' }),
          BarDepthFront({ dataKey: 'a' }),
          BarPulse({ dataKey: 'a', activeIndex: 0 }),
        ],
      }
      const current = draw(owner, options)
      expect(seen).toEqual(data)
      const nodes = flatten(current.scene.nodes)
      const red = nodes.find((node) => node.key === 'depth-back:a:0:side')
      const blue = nodes.find((node) => node.key === 'depth-back:a:0:side:1')
      const lid = nodes.find((node) => node.key === 'depth-back:a:0:lid')
      if (red?.kind !== 'area' || blue?.kind !== 'area' || lid?.kind !== 'area')
        throw new Error('Expected segmented provider surfaces')
      expect(red.style?.fill).toBe('red')
      expect(blue.style?.fill).toBe('blue')
      expect(lid.style?.fill).toBe('blue')
      expect(red.points[0]?.[1]).toBeCloseTo(400 - (400 * 10) / 45, 10)
      expect(front(current.scene, 'depth-front:a:0:glass').width).toBe(18)
      const wave = front(current.scene, 'bar-pulse:a:0:wave')
      const depth = 3.96 * (1 - 9 / 200)
      expect(wave.x).toBeCloseTo(-depth - 1, 10)
      expect(wave.width).toBeCloseTo(18 + depth * 2 + 2, 10)
      expect(current.snapshot.pulseClips).toHaveLength(1)
      expect(current.snapshot.pulseClips[0]?.path).toContain(`L ${18 + depth}`)
      const pulse = groups(current.scene.nodes).find((node) => node.key === 'bar-pulse:a:0')
      expect(pulse?.clip).toBeUndefined()
      expect(pulse?.className).toContain(current.snapshot.pulseClips[0]?.className)
      expect(
        draw(owner, {
          ...options,
          children: [
            ...options.children.filter((child) => child.kind !== 'barPulse'),
            BarPulse({ dataKey: 'a' }),
          ],
        }).snapshot.pulseClips,
      ).toEqual([])
      expect(
        draw(owner, {
          ...options,
          children: [
            ...options.children.filter((child) => child.kind !== 'barPulse'),
            BarPulse({ dataKey: 'a', activeIndex: 0, pulsePaused: true }),
          ],
        }).snapshot.pulseClips,
      ).toEqual([])
    }),
)

it.effect(
  'zero width retires categorical paint while negative width follows each Source consumer rather than a blanket drop',
  () =>
    Story.withBlock(subject, (owner) => {
      const options: BarChartProps<typeof Row.Type> = {
        ...props,
        barGap: 0.2,
        barWidth: 0,
        children: [
          Bar({ dataKey: 'a', groupGap: -12 }),
          BarSquares({ dataKey: 'b', groupGap: -12 }),
          BarColumnTrack({ groupGap: -12 }),
          BarDepthProvider(),
          BarDepthBack({ dataKey: 'a' }),
          BarDepthFront({ dataKey: 'a' }),
          BarPulse({ dataKey: 'a', activeIndex: 0 }),
          BarXAxis(),
          BarYAxis(),
        ],
      }
      const zero = draw(owner, options)
      expect(
        flatten(zero.scene.nodes).filter(
          (node) => node.kind === 'rect' || node.kind === 'area' || node.kind === 'label',
        ),
      ).toEqual([])
      expect(zero.scene.points.some((point) => point.datum.source === data[0])).toBe(true)
      expect(zero.scene.points.some((point) => point.datum.source === data[1])).toBe(true)
      expect(zero.snapshot.pulseClips).toEqual([])
      const negative = draw(owner, {
        ...options,
        barWidth: -0.1,
        children: [
          Bar({ dataKey: 'a' }),
          Bar({ dataKey: 'b', yAxisId: 'right' }),
          BarDepthProvider(),
          BarDepthBack({ dataKey: 'a' }),
          BarDepthFront({ dataKey: 'a' }),
          BarPulse({ dataKey: 'a', activeIndex: 0 }),
        ],
      })
      expect(
        flatten(negative.scene.nodes).filter(
          (node) =>
            node.key.startsWith('bars:') ||
            node.key.startsWith('depth-front:') ||
            node.key.startsWith('depth-back:'),
        ),
      ).toEqual([])
      expect(negative.snapshot.pulseClips).toHaveLength(1)
      expect(front(negative.scene, 'bar-pulse:a:0:wave').width).toBeGreaterThan(0)
      const negativeGap = draw(owner, {
        ...props,
        barWidth: -0.1,
        children: [Bar({ dataKey: 'a', groupGap: -12 }), Bar({ dataKey: 'b', groupGap: -12 })],
      })
      expect(front(negativeGap.scene, 'bars:0:a').width).toBeCloseTo(5.95, 12)
      const defaultAgain = draw(owner, props)
      expect(defaultAgain.snapshot.bandWidth).toBe(200)
      expect(front(defaultAgain.scene, 'bars:0:a').width).toBe(98)
    }),
)

it.effect(
  'negative depth selects the mirrored per-bar glass for both side and front while positive glass stays unchanged',
  () =>
    Story.withBlock(subject, (owner) => {
      const rows = [Row.make({ name: 'A', a: -2, b: 0 }), Row.make({ name: 'B', a: 20, b: 0 })]
      const current = draw(
        owner,
        {
          ...props,
          barGap: 0.2,
          children: [
            Bar({ dataKey: 'a' }),
            BarDepthProvider({ groundShadow: 0.6 }),
            BarDepthBack({ dataKey: 'a' }),
            BarDepthFront({ dataKey: 'a' }),
            BarPulse({ dataKey: 'a', activeIndex: 0 }),
          ],
        },
        rows,
      )
      const negative = front(current.scene, 'depth-front:a:0:glass')
      const positive = front(current.scene, 'depth-front:a:1:glass')
      const side = flatten(current.scene.nodes).find(
        (node) => node.key === 'depth-back:a:0:side-glass',
      )
      expect(side?.style?.fill).toBe(negative.style?.fill)
      expect(negative.style?.fill).not.toBe(positive.style?.fill)
      const negativeId = /^url\(#(?<id>[^)]+)\)$/u.exec(negative.style?.fill ?? '')?.groups?.id
      const positiveId = /^url\(#(?<id>[^)]+)\)$/u.exec(positive.style?.fill ?? '')?.groups?.id
      expect(current.scene.gradients.find((gradient) => gradient.id === negativeId)?.stops).toEqual(
        [
          { offset: 0, color: 'black', opacity: 0.6 },
          { offset: 0.45, color: 'white', opacity: 0 },
          { offset: 0.92, color: 'white', opacity: 0.02 },
          { offset: 0.97, color: 'white', opacity: 0.09 },
          { offset: 1, color: 'white', opacity: 0.2 },
        ],
      )
      expect(
        current.scene.gradients.find((gradient) => gradient.id === positiveId)?.stops[0],
      ).toEqual({ offset: 0, color: 'white', opacity: 0.2 })
      expect(
        groups(current.scene.nodes).find((node) => node.key === 'bar-pulse:a:0:sweep')?.className,
      ).toContain('bkm-pulse-negative')
    }),
)
