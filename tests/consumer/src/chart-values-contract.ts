import { HeatmapChart, SankeyNode } from '@/ui/charts/index.js'

export const userLabels = SankeyNode({ formatValue: (value) => `${value} users` })
export const calendar = HeatmapChart({ name: 'external-observations' }).inputs('observations', {
  data: [{ bin: 0, bins: [{ bin: 0, date: new Date(0), count: 0, observed: false }] }],
})
