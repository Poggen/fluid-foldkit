import { Schema } from 'effect'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import { BarChart, Bar, ChartTooltip } from '../src/index'
import { nativeTooltip } from '../src/cartesian/native-tooltip'

export const mountNativeTooltipFixture = (
  root: HTMLElement,
  hostElement: HTMLElement,
  button: (label: string, action: () => void) => void,
) => {
  const Row = Schema.Struct({ name: Schema.String, value: Schema.Finite })
  const data = [Row.make({ name: 'Week 1', value: 32 }), Row.make({ name: 'Week 2', value: 48 })]
  const recipe = BarChart({ name: 'visual-native-tooltip', Row })
  const tooltip = document.createElement('div')
  tooltip.id = 'visual-native-tooltip'
  tooltip.style.visibility = 'hidden'
  const body = document.createElement('div')
  body.className = 'ts-chart-tooltip__body'
  body.style.width = '180px'
  body.style.height = '80px'
  body.textContent = 'Week 1: 32 active users'
  tooltip.append(body)
  root.append(tooltip)
  const inputs = recipe.inputs('visual-native', {
    children: [Bar({ dataKey: 'value' }), ChartTooltip()],
  })
  const host = mountChartRenderer(hostElement, {
    definition: {
      ...inputs.definition(data),
      tooltip: { use: nativeTooltip(tooltip), sticky: true, anchor: { x: 'value', y: 'plot-top' } },
    },
    renderer: motion({ initial: false }),
    ariaLabel: 'Native tooltip lifecycle',
    idPrefix: 'visual-native',
    width: 640,
    height: 320,
  })
  const point = host.getScene().points[0]
  if (point === undefined) throw new Error('Missing actual renderer focus point')
  button('Focus native tooltip', () => {
    host.interaction.setControlledFocus(point)
    tooltip.dataset.synchronousOpacity = tooltip.style.opacity
    tooltip.dataset.synchronousLeft = tooltip.style.left
    tooltip.dataset.synchronousTop = tooltip.style.top
  })
  button('Reveal native tooltip', () => tooltip.style.removeProperty('visibility'))
  button('Pin native tooltip', () => host.interaction.setControlledFocus(point, { pinned: true }))
  button('Leave native tooltip', () => host.interaction.setControlledFocus(null))
  button('Dispose native tooltip', () => host.destroy())
}
