import { mountHeatmapLoadingFixture } from './chart-visual-contracts-heatmap-fixture'
import { DateTime } from 'effect'
import { mountNativeTooltipFixture } from '../../registry/charts/test/chart-visual-contracts-native-tooltip.fixture'
import { constUndefined } from 'effect/Function'
import { FunnelChart, RadarChart, RadarArea, RadarLabels } from '@foldkit-visuals/charts'
import { HeatmapChart, HeatmapCells, HeatmapTooltip } from '@foldkit-visuals/charts/heatmap'
import type { HeatmapTooltipProps, HeatmapChartProps } from '@foldkit-visuals/charts/heatmap'
import { Ring, ringInputs } from '@foldkit-visuals/charts/ring'

const root = document.getElementById('style-contract-root')
if (!(root instanceof HTMLElement)) throw new Error('Missing runtime fixture root')
const mode = root.dataset.fixture
const button = (label: string, action: () => void) => {
  const element = document.createElement('button')
  element.textContent = label
  element.addEventListener('click', action)
  root.append(element)
}
const hostElement = document.createElement('div')
hostElement.style.width = mode === 'funnel' ? '1000px' : '400px'
hostElement.style.height = mode === 'funnel' ? '500px' : '400px'
root.append(hostElement)
const clock = () => performance.now()

if (mode === 'funnel') {
  const data = Array.from({ length: 25 }, (_, index) => ({
    label: `Stage ${index}`,
    value: 100 - index,
  }))
  const inputs = FunnelChart({ name: 'visual-funnel' }).inputs('large" funnel', {
    data,
    layers: 10,
    staggerDelay: 0,
    enterTransition: { duration: 0.8 },
  })
  const host = inputs.mount(hostElement, data, null, constUndefined, clock, (size) =>
    host.acceptLayout?.(size, true),
  )
  button('Focus first stage', () => host.update(data, 0))
  button('Focus final stage', () => host.update(data, 24))
  button('Clear funnel focus', () => host.update(data, null))
  button('Dispose funnel', () => host.destroy())
} else if (mode === 'radar') {
  const data = [{ label: 'Series', values: { a: 50, b: 50, c: 50 } }]
  const inputs = RadarChart({ name: 'visual-radar' }).inputs('reduced-radar', {
    data,
    size: 320,
    margin: 60,
    metrics: [
      { key: 'a', label: 'Alpha' },
      { key: 'b', label: 'Beta' },
      { key: 'c', label: 'Gamma' },
    ],
    children: [RadarArea({ index: 0 }), RadarLabels()],
  })
  const host = inputs.mount(hostElement, data, null, constUndefined, clock, constUndefined)
  button('Dispose radar', () => host.destroy())
} else if (mode === 'heatmap-loading') {
  mountHeatmapLoadingFixture(root)
} else if (mode === 'ring') {
  const data = [{ label: 'Progress', value: 75, maxValue: 100 }]
  const inputs = ringInputs('visual-ring', {
    data,
    size: 320,
    children: [Ring({ index: 0, animate: false })],
  })
  const host = inputs.mount(hostElement, data, null, constUndefined, clock, constUndefined)
  button('Focus ring', () => host.update(data, 0))
  button('Dispose ring', () => host.destroy())
} else if (mode === 'heatmap') {
  const data = [
    {
      bin: 0,
      bins: Array.from({ length: 7 }, (_, row) => ({
        bin: row,
        count: row + 1,
        date: DateTime.toDateUtc(
          DateTime.makeZonedUnsafe(
            { year: 2026, month: 11, day: 8 + row, hour: 12 },
            { timeZone: DateTime.zoneMakeLocal(), adjustForTimeZone: true },
          ),
        ),
      })),
    },
  ]
  const recipe = HeatmapChart({ name: 'visual-heatmap' })
  const props = (tooltip: HeatmapTooltipProps): HeatmapChartProps => ({
    data,
    animate: false,
    binSize: 24,
    children: [HeatmapCells({ hideGhostCells: false }), HeatmapTooltip(tooltip)],
  })
  const initial: HeatmapTooltipProps = {
    instant: true,
    className: 'authored-tooltip',
    backgroundColor: 'red',
    panelStyle: {
      backgroundColor: 'green',
      padding: 9,
      width: 180,
      marginTop: 0,
      opacity: 0.35,
      transform: 'rotate(7deg)',
      '--tooltip-accent': 6,
    },
  }
  const inputs = recipe.inputs('visual-heatmap', props(initial))
  const host = inputs.mount(
    hostElement,
    data,
    null,
    null,
    (focus) => host.update(data, focus, null, true),
    clock,
    constUndefined,
    DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-15T12:00:00Z')),
    true,
    constUndefined,
    constUndefined,
  )
  button('Show first cell', () => host.update(data, 0, null, true))
  button('Remove panel styles', () => {
    recipe
      .inputs(
        'visual-heatmap',
        props({
          instant: true,
          backgroundColor: 'purple',
          panelStyle: { backgroundColor: undefined },
          formatLabel: (count) => `Count ${count}`,
        }),
      )
      .configure(host)
    host.update(data, 1, null, true)
  })
  button('Set blue background', () => {
    recipe
      .inputs('visual-heatmap', props({ instant: true, backgroundColor: 'blue' }))
      .configure(host)
  })
  button('Dispose heatmap', () => host.destroy())
} else if (mode === 'native-tooltip') {
  mountNativeTooltipFixture(root, hostElement, button)
} else {
  throw new Error(`Unknown chart visual runtime fixture: ${mode}`)
}
root.dataset.ready = 'true'
