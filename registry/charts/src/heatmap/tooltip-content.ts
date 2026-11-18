import type { CellDatum } from './definition'
import type { HeatmapTooltipProps } from './carriers'
import { applyChartStyle } from '../cartesian/style'
import {
  formatHeatmapContributionLabel,
  formatHeatmapTooltipDate,
  formatHeatmapTooltipWeekday,
} from './format'

export const heatmapTooltipContent = (body: HTMLElement) => {
  let previousProps: HeatmapTooltipProps | undefined
  let lines: ReadonlyArray<Text> = []

  return (datum: Readonly<CellDatum>, props: HeatmapTooltipProps) => {
    if (props !== previousProps) {
      const panel = document.createElement('div')
      panel.className = `bkm-tooltip-panel ${props.className ?? ''}`
      const content = document.createElement('div')
      content.className = 'bkm-tooltip-content'
      lines = [
        'ts-bkm-heatmap-tooltip-date',
        'ts-bkm-heatmap-tooltip-weekday',
        'ts-bkm-heatmap-tooltip-divider',
        'ts-bkm-heatmap-tooltip-value',
      ].map((className) => {
        const line = document.createElement('div')
        line.className = className
        const text = document.createTextNode('')
        line.append(text)
        content.append(line)
        return text
      })
      panel.append(content)
      applyChartStyle(panel, { backgroundColor: props.backgroundColor, ...props.panelStyle })
      body.replaceChildren(panel)
      previousProps = props
    }

    const values = [
      formatHeatmapTooltipDate(datum.date),
      formatHeatmapTooltipWeekday(datum.date),
      '',
      (props.formatLabel ?? formatHeatmapContributionLabel)(datum.count, datum.date),
    ]

    lines.forEach((line, index) => {
      const value = values[index] ?? ''
      if (line.data !== value) line.data = value
    })
  }
}
