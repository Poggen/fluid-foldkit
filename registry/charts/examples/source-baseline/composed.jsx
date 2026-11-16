import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
const original = new URLSearchParams(location.search).get('implementation') === 'original'
const { ComposedChart } = original
  ? await import('@original-charts/composed-chart')
  : await import('@charts-source/charts/composed-chart')
const { SeriesBar } = original
  ? await import('@original-charts/series-bar')
  : await import('@charts-source/charts/composed/series-bar')
const { Area } = original
  ? await import('@original-charts/area')
  : await import('@charts-source/charts/kit/cartesian/carriers')
const { Line } = original
  ? await import('@original-charts/line')
  : await import('@charts-source/charts/kit/cartesian/carriers')
const { XAxis } = original
  ? await import('@original-charts/x-axis')
  : await import('@charts-source/charts/kit/cartesian/carriers')
const { YAxis } = original
  ? await import('@original-charts/y-axis')
  : await import('@charts-source/charts/kit/cartesian/carriers')
const { Grid } = original
  ? await import('@original-charts/grid')
  : await import('@charts-source/charts/kit/cartesian/carriers')
const { ChartTooltip } = original
  ? await import('@original-charts/tooltip/chart-tooltip')
  : await import('@charts-source/charts/kit/cartesian/carriers')
if (original) await import('@original-globals')
else await import('@charts-source/charts/styles.css')
await import('./style.css')
document.title = original ? 'Original Bklit Composed' : 'Migrated TanStack Composed'
document.documentElement.style.setProperty('--font-geist-sans', 'Geist')
const data = [120, 180, 150, 240, 210, 290, 180].map((revenue, index) => ({
  date: new Date(Date.UTC(2025, 0, index + 1)),
  revenue,
  cost: revenue * 0.6,
}))
function Showcase() {
  const [stacked, setStacked] = useState(false)
  const [rows, setRows] = useState(data)
  const [mounted, setMounted] = useState(true)
  return (
    <>
      <nav>
        <button onClick={() => setStacked((value) => !value)}>Change options</button>
        <button onClick={() => setRows([])}>Empty</button>
        <button onClick={() => setRows(data)}>Restore</button>
        <button
          onClick={() =>
            setRows(
              data
                .slice(1, 6)
                .map((row) => ({ ...row, revenue: row.revenue * 0.8, cost: row.cost * 1.2 })),
            )
          }
        >
          Change data
        </button>
        <button onClick={() => setMounted(false)}>Unmount</button>
        <button onClick={() => setMounted(true)}>Remount</button>
      </nav>
      <section id="composed-fixture" style={{ width: 640, height: 320 }}>
        {mounted && (
          <ComposedChart
            data={rows}
            xDataKey="date"
            animationDuration={1100}
            barSize={24}
            stacked={stacked}
            stackGap={stacked ? 2 : 0}
          >
            <Grid />
            {!stacked && <Area dataKey="cost" fill="rgb(30, 150, 90)" showLine={false} />}
            {!stacked && <Line dataKey="revenue" stroke="navy" fadeEdges={false} />}
            {stacked && <SeriesBar dataKey="revenue" fill="navy" />}
            <SeriesBar dataKey="cost" fill="rgb(30, 150, 90)" />
            <XAxis />
            <YAxis />
            <ChartTooltip />
          </ComposedChart>
        )}
      </section>
    </>
  )
}
await document.fonts.load('500 14px Geist')
createRoot(document.getElementById('root')).render(<Showcase />)
