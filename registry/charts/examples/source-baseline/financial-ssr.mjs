import React from 'react'
import { renderToString } from 'react-dom/server.node'
import { sourceFile } from './source-reference.mjs'
const { CandlestickChart } = await import(sourceFile('charts/candlestick-chart.tsx'))
const { Candlestick } = await import(sourceFile('charts/candlestick/carrier.ts'))
const { ScatterChart } = await import(sourceFile('charts/scatter-chart.tsx'))
const { Scatter, Grid, XAxis, YAxis } = await import(sourceFile('charts/kit/cartesian/carriers.ts'))
const data = [
  { open: 10, high: 25, low: 5, close: 20 },
  { open: 20, high: 30, low: 0, close: 10 },
  { open: 15, high: 18, low: 12, close: 15 },
].map((values, index) => ({ ...values, date: new Date(index * 86_400_000) }))
const h = React.createElement
process.stdout.write(
  JSON.stringify({
    candlestick: renderToString(
      h(
        CandlestickChart,
        { data, animationDuration: 1100 },
        h(Grid),
        h(Candlestick),
        h(XAxis),
        h(YAxis),
      ),
    ),
    scatter: renderToString(
      h(
        ScatterChart,
        { data, animationDuration: 1100 },
        h(Grid),
        h(Scatter, { dataKey: 'close' }),
        h(XAxis),
        h(YAxis),
      ),
    ),
  }),
)
