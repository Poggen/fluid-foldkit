// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { DateTime, Predicate, Schema } from 'effect'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'
import { expect, it } from 'vitest'
import { frameData, frameSteps, time } from 'motion-dom'
import { Area, AreaChart, ChartTooltip, Line, LineChart } from '@foldkit-visuals/charts/line'
import type { CartesianSnapshot } from '../definition'
import { initialInteraction } from '../state'
import { timeSeriesHoverModel } from '../time-series-overlay'
import type { ChartTooltipProps } from '../tooltip-options'
import { HoverOverlay, overlayPlotOf } from '../hover-overlay'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const rows = [20, 50, 30].map((value, index) =>
  Row.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 1000)), value }),
)

const flatten: (nodes: ReadonlyArray<SceneNode>) => ReadonlyArray<SceneNode> = (
  nodes: ReadonlyArray<SceneNode>,
) => nodes.flatMap((node) => (node.kind === 'group' ? flatten(node.children) : [node]))

const hoverInspector = (
  root: typeof LineChart,
  series: typeof Line | typeof Area,
  data: ReadonlyArray<typeof Row.Type> = rows,
  measureText: (text: string) => number | null = () => null,
) => {
  const chart = root({ name: 'hover-source-contract', Row })
  const runtime = createChartRuntime<typeof Row.Type, Date, number>()

  const inspect = (
    enabled: boolean,
    panel: boolean,
    showMarkers = false,
    showDots = true,
    status: 'ready' | 'loading' = 'ready',
    indicatorColor?: Exclude<
      ChartTooltipProps<typeof Row.Type>['indicatorColor'],
      string | undefined
    >,
    dotColor?: Exclude<ChartTooltipProps<typeof Row.Type>['dotColor'], string | undefined>,
    tooltipOptions: ChartTooltipProps<typeof Row.Type> = {},
  ) => {
    let tooltip: ChartTooltipProps<typeof Row.Type> = { showDots, ...tooltipOptions }

    if (indicatorColor !== undefined) {
      tooltip = { ...tooltip, indicatorColor }
    }

    if (dotColor !== undefined) {
      tooltip = { ...tooltip, dotColor }
    }

    const props = {
      animationDuration: 0,
      status,
      children: [
        series({ dataKey: 'value', showHighlight: enabled, showMarkers }),
        ...(panel ? [ChartTooltip<typeof Row.Type>(tooltip)] : []),
      ],
    }

    const state = initialInteraction(chart.configuration(props))

    let snapshot: CartesianSnapshot<typeof Row.Type> | undefined

    const definition = chart.inputs('hover-source-contract', props).resourceDefinition?.(
      data,
      state,
      (value) => {
        snapshot = value
      },
      () => 0,
    )

    if (definition === undefined) {
      throw new Error('The public chart requires its drawing definition')
    }

    const scene = runtime.render(definition, { width: 640, height: 320 })

    if (snapshot === undefined) {
      throw new Error('The chart runtime must publish its hover visuals')
    }

    return {
      plot: overlayPlotOf(snapshot),
      margin: snapshot.margin,
      markerNodes: flatten(scene.nodes).filter((node) => node.kind === 'dot'),
      hover: snapshot.hover,
      overlay: timeSeriesHoverModel(
        snapshot,
        props,
        panel ? tooltip : undefined,
        measureText,
        true,
      ),
    }
  }

  return {
    inspect,
    destroy: () => {
      runtime.destroy()
    },
  }
}

it.each([
  { name: 'Line', root: LineChart, series: Line },
  { name: 'Area', root: AreaChart, series: Area },
])(
  '$name hover highlight works without a tooltip panel and honors showHighlight',
  ({ name, root, series }) => {
    const { inspect, destroy } = hoverInspector(root, series)

    try {
      const withPanel = inspect(true, true)

      const dynamicColor = inspect(true, true, false, true, 'ready', (row) =>
        Number(row.value) > 40 ? 'red' : 'blue',
      ).overlay?.crosshair?.color

      if (!Predicate.isFunction(dynamicColor)) {
        throw new TypeError('The indicator must resolve its color from each focused caller row')
      }

      expect(rows.map(dynamicColor)).toEqual(['blue', 'red', 'blue'])

      const dotCalls: Array<{ readonly point: object; readonly key: string }> = []

      const dynamicDot = inspect(true, true, false, true, 'ready', undefined, (point, config) => {
        dotCalls.push({ point, key: config.dataKey })

        return Number(point.value) > 40 ? 'purple' : 'green'
      }).overlay?.dots.find((dot) => dot.glide)?.colorOf

      if (dynamicDot === undefined) {
        throw new TypeError('Tooltip dot color must resolve the actual caller row and line')
      }

      expect(rows.map(dynamicDot)).toEqual(['green', 'purple', 'green'])
      expect(dotCalls.map((call) => call.key)).toEqual(['value', 'value', 'value'])
      expect(dotCalls[1]?.point).toBe(rows[1])
      const withoutPanel = inspect(true, false)
      expect(withoutPanel.hover.highlights).toHaveLength(1)
      expect(withoutPanel.hover.highlights).toEqual(withPanel.hover.highlights)
      expect(withoutPanel.hover.dim).toEqual(withPanel.hover.dim)

      const markersWithoutPanel = inspect(true, false, true)
      expect(markersWithoutPanel.overlay?.dots).toHaveLength(1)
      expect(markersWithoutPanel.overlay?.dots[0]?.glide).toBe(false)
      expect(markersWithoutPanel.overlay?.crosshair).toBeNull()
      expect(markersWithoutPanel.overlay?.pill).toBeNull()
      const markersWithoutTooltipDots = inspect(true, true, true, false)
      expect(markersWithoutTooltipDots.overlay?.dots).toHaveLength(1)
      expect(markersWithoutTooltipDots.overlay?.dots[0]?.glide).toBe(false)
      expect(withoutPanel.overlay).toBeNull()

      const loading = inspect(true, false, true, true, 'loading')
      expect(loading.markerNodes).toHaveLength(name === 'Line' ? rows.length * 2 : 0)

      if (name === 'Line') {
        expect(loading.markerNodes.map((node) => node.style?.fill)).toContain(
          'var(--chart-line-primary)',
        )
      }

      const disabled = inspect(false, true)
      expect(disabled.hover.highlights).toHaveLength(0)
      expect(disabled.hover.dim.length).toBeGreaterThan(0)
      expect(
        disabled.hover.dim.every((rule) => rule.opacity === 1 && rule.legendOpacity === 1),
      ).toBe(true)
    } finally {
      destroy()
    }
  },
)

it.each([
  { name: 'Line', root: LineChart, series: Line },
  { name: 'Area', root: AreaChart, series: Area },
])('$name tooltip honors ring geometry, scale and row color precedence', ({ root, series }) => {
  const { inspect, destroy } = hoverInspector(root, series)

  try {
    const ring = inspect(true, true, false, true, 'ready', undefined, undefined, {
      dotVariant: 'ring',
      dotSize: 7,
      dotScale: 1.4,
      dotRadiusFraction: 0.12,
      dotStrokeWidth: 3,
      dotColor: 'red',
      rows: (point) => [{ color: 'green', label: 'Value', value: Number(point.value) }],
    }).overlay?.dots.find((dot) => dot.glide)

    if (ring === undefined || Predicate.isFunction(ring.shapes)) {
      throw new TypeError('Time-series ring tooltip requires its authored pixel geometry')
    }

    expect(ring.shapes[0]).toMatchObject({
      fill: 'transparent',
      strokeWidth: 3,
    })
    expect(ring.shapes[0]?.r).toBeCloseTo(9.8)
    expect(ring.shapes[0]?.corner).toBeCloseTo(2.352)

    if (ring.colorOf === undefined) {
      throw new TypeError('Tooltip row colors must override an explicit dot color')
    }

    expect(rows.map(ring.colorOf)).toEqual(['green', 'green', 'green'])

    const filled = inspect(true, true, false, true, 'ready', undefined, undefined, {
      dotScale: 2,
      dotStrokeWidth: 9,
    }).overlay?.dots.find((dot) => dot.glide)

    if (filled === undefined || Predicate.isFunction(filled.shapes)) {
      throw new TypeError('Time-series filled dot requires its authored pixel geometry')
    }

    expect(filled.shapes[0]).toMatchObject({ r: 10, strokeWidth: 2 })
  } finally {
    destroy()
  }
})

it('tooltip fade options reach the retained physical crosshair, including solid and dashed paint', () => {
  const { inspect, destroy } = hoverInspector(LineChart, Line)
  const overlay = new HoverOverlay<typeof Row.Type>('crosshair-fade-owner', () => 0)

  try {
    const cases = [
      {
        options: { indicatorFadeEdges: 'top', indicatorFadeLength: 25 },
        stops: [
          ['0%', '0'],
          ['25%', '1'],
          ['100%', '1'],
        ],
      },
      {
        options: { indicatorFadeEdges: 'bottom', indicatorFadeLength: 90 },
        stops: [
          ['0%', '1'],
          ['60%', '1'],
          ['100%', '0'],
        ],
      },
      {
        options: { indicatorFadeEdges: 'both', indicatorFadeLength: 0 },
        stops: [
          ['0%', '0'],
          ['2%', '1'],
          ['50%', '1'],
          ['98%', '1'],
          ['100%', '0'],
        ],
      },
      { options: { indicatorFadeEdges: 'none' }, stops: [] },
      { options: { indicatorFadeEdges: 'top', indicatorDasharray: '6,4' }, stops: [] },
    ] satisfies ReadonlyArray<{
      readonly options: ChartTooltipProps<typeof Row.Type>
      readonly stops: ReadonlyArray<readonly [string, string]>
    }>

    for (const { options, stops } of cases) {
      const current = inspect(true, true, false, false, 'ready', undefined, undefined, {
        showDatePill: false,
        ...options,
      })

      if (current.overlay === null) {
        throw new Error('The real Line compiler must supply its crosshair')
      }

      overlay.update(current.overlay, current.plot, current.margin)
      overlay.focus(rows[0]?.date.getTime() ?? 0, rows[0] ?? null)
      const rule = overlay.root.querySelector('.bkm-hov-x')

      const actual = [...(rule?.querySelectorAll('stop') ?? [])].map((stop) => [
        stop.getAttribute('offset'),
        stop.style.getPropertyValue('--bkm-rule-stop-opacity'),
      ])

      expect(actual).toEqual(stops)

      if (options.indicatorDasharray !== undefined) {
        expect(rule?.querySelector('line')?.style.getPropertyValue('--bkm-rule-dash')).toBe('6 4')
        expect(rule?.querySelector('rect')).toBeNull()
      } else if (options.indicatorFadeEdges === 'none') {
        expect(rule?.querySelector('rect')?.style.getPropertyValue('--bkm-rule-fill')).toBe(
          'var(--chart-crosshair)',
        )
        expect(rule?.querySelector('linearGradient')).toBeNull()
      }
    }
  } finally {
    overlay.destroy()
    destroy()
  }
})

it.each([
  { name: 'Line', root: LineChart, series: Line, count: 60 },
  { name: 'Line', root: LineChart, series: Line, count: 61 },
  { name: 'Area', root: AreaChart, series: Area, count: 60 },
  { name: 'Area', root: AreaChart, series: Area, count: 61 },
])(
  '$name crosshair and date pill glide continuously with $count rows',
  ({ root, series, count }) => {
    const previousFrame = { ...frameData }
    let now = 0

    const advance = (frames: number) => {
      for (let index = 0; index < frames; index += 1) {
        now += 1000 / 60
        time.set(now)
        Object.assign(frameData, { timestamp: now, delta: 1000 / 60, isProcessing: true })
        for (const step of Object.values(frameSteps)) step.process(frameData)
        frameData.isProcessing = false
      }
    }

    time.set(now)
    const data = Array.from({ length: count }, (_, index) =>
      Row.make({
        date: DateTime.toDateUtc(
          DateTime.add(DateTime.makeUnsafe('2026-01-01T12:00:00.000Z'), { days: index }),
        ),
        value: 20 + (index % 30),
      }),
    )
    const { inspect, destroy } = hoverInspector(root, series, data, (text) => text.length * 8)
    const overlay = new HoverOverlay<typeof Row.Type>('continuous-hover', () => now)

    try {
      const current = inspect(true, true)
      if (current.overlay === null) throw new Error('Public chart must produce a hover overlay')
      overlay.update(current.overlay, current.plot, current.margin)
      const rule = overlay.root.querySelector<SVGElement>('.bkm-hov-x svg > rect')
      const pill = overlay.root.querySelector<HTMLElement>('.bkm-hov-pill')
      const dot = overlay.root.querySelector<HTMLElement>('.bkm-hov-dot')
      if (rule === null || pill === null || dot === null)
        throw new Error('Crosshair, date pill and dot must be mounted')
      const positions = () => [
        Number.parseFloat(rule.style.transform.replace('translateX(', '')),
        Number.parseFloat(pill.style.left),
      ]
      const focus = (index: number) => {
        const row = data[index]
        if (row === undefined) throw new Error('Hover fixture row missing')
        overlay.focus(row.date.getTime(), row)
        const [start, end] = current.plot.xDomain
        return (
          current.margin.left +
          ((row.date.getTime() - start) / (end - start)) * current.plot.innerWidth
        )
      }

      const start = focus(0)
      for (const position of positions()) expect(position).toBeCloseTo(start, 5)
      advance(2)
      const dotStart = dot.style.transform
      const target = focus(count - 1)
      expect(dot.style.transform).toBe(dotStart)
      for (const position of positions()) expect(position).toBeCloseTo(start, 5)
      advance(4)
      const moving = positions()
      const movingDot = dot.style.transform
      expect(movingDot).not.toBe(dotStart)
      for (const position of moving) {
        expect(position).toBeGreaterThan(start + 1)
        expect(position).toBeLessThan(target - 1)
      }

      const retarget = focus(Math.floor(count / 2))
      expect(positions()).toEqual(moving)
      expect(dot.style.transform).toBe(movingDot)
      advance(1)
      for (const [index, position] of positions().entries()) {
        expect(Math.abs(position - (moving[index] ?? 0))).toBeLessThan((target - start) / 4)
        expect(Math.abs(position - retarget)).toBeGreaterThan(1)
      }
      advance(180)
      for (const position of positions()) expect(position).toBeCloseTo(retarget, 2)

      const text = pill.querySelector('.bkm-hov-pill-text')
      if (count > 60) {
        expect(pill.querySelectorAll('span')).toHaveLength(1)
        expect(pill.querySelector('.bkm-hov-pill-stack')).toBeNull()
        expect(text?.textContent).toBe('Jan 31')
      } else {
        expect(text).toBeNull()
        expect(pill.querySelectorAll('.bkm-hov-pill-stack')).toHaveLength(2)
      }
    } finally {
      overlay.destroy()
      advance(2)
      destroy()
      Object.assign(frameData, previousFrame)
      time.set(performance.now())
    }
  },
)
