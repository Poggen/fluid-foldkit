import React from 'react'
import { renderToString } from 'react-dom/server.node'
import { sourceFile } from './source-reference.mjs'
const { PieChart } = await import(sourceFile('charts/pie-chart.tsx'))
const { PieCenter, PieCenterShell } = await import(sourceFile('charts/pie/center.tsx'))
const { RingChart } = await import(sourceFile('charts/ring-chart.tsx'))
const { RingCenter } = await import(sourceFile('charts/ring/center.tsx'))
const style = {
  width: 320,
  lineHeight: 1.25,
  fontWeight: 500,
  floodOpacity: 0.25,
  stopOpacity: 0.5,
  WebkitFlexGrow: 2,
  msFlex: 2,
  '--CustomColor': 'red',
  '--CustomNumeric': 2,
}
const data = [
    { label: 'A', value: 3 },
    { label: 'B', value: 1 },
  ],
  h = React.createElement
process.stdout.write(
  JSON.stringify({
    pie: renderToString(h(PieChart, { data, size: 320, innerRadius: 70, style }, h(PieCenter))),
    ring: renderToString(
      h(RingChart, { data: data.map((d) => ({ ...d, maxValue: 5 })), size: 320 }, h(RingCenter)),
    ),
    shell: renderToString(
      h(PieCenterShell, { centerValue: 4, contextSize: 320, innerRadiusPx: 70 }),
    ),
  }),
)
