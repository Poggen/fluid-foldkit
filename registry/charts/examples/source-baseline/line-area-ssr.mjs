import React from 'react'
import { renderToString } from 'react-dom/server.node'
import { sourceFile } from './source-reference.mjs'

const { LineChart } = await import(sourceFile('charts/line-chart.tsx'))
const { AreaChart } = await import(sourceFile('charts/area-chart.tsx'))
const { Line, Area, Grid, XAxis, YAxis } = await import(
  sourceFile('charts/kit/cartesian/carriers.ts')
)
const data = [120, 180, 150, 240, 210, 290, 180].map((revenue, index) => ({
  date: new Date(Date.UTC(2025, 0, index + 1)),
  revenue,
  cost: revenue * 0.6,
}))
const h = React.createElement
const line = renderToString(
  h(
    LineChart,
    { data, animationDuration: 1100 },
    h(Grid, { horizontal: true }),
    h(Line, { dataKey: 'revenue', showMarkers: true }),
    h(XAxis),
    h(YAxis),
  ),
)
const area = renderToString(
  h(
    AreaChart,
    { data, animationDuration: 1100 },
    h(Grid, { horizontal: true }),
    h(Area, { dataKey: 'revenue', fill: 'var(--chart-1)' }),
    h(XAxis),
    h(YAxis),
  ),
)
process.stdout.write(JSON.stringify({ line, area }))
