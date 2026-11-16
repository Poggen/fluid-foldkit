import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import '../family-consumer.css'

const original = new URLSearchParams(location.search).get('implementation') === 'original'

const { ScatterChart } = original
  ? await import('@original-charts/scatter-chart')
  : await import('@charts-source/charts/scatter-chart')

const { Scatter } = original
  ? await import('@original-charts/scatter')
  : await import('@charts-source/charts/kit/cartesian/carriers')

const { Grid } = original
  ? await import('@original-charts/grid')
  : await import('@charts-source/charts/kit/cartesian/carriers')

const { XAxis } = original
  ? await import('@original-charts/x-axis')
  : await import('@charts-source/charts/kit/cartesian/carriers')

const { YAxis } = original
  ? await import('@original-charts/y-axis')
  : await import('@charts-source/charts/kit/cartesian/carriers')

const { ChartTooltip } = original
  ? await import('@original-charts/tooltip/chart-tooltip')
  : await import('@charts-source/charts/kit/cartesian/carriers')

if (original) {
  await import('@original-globals')
}

if (!original) {
  await import('@charts-source/charts/styles.css')
}

for (const [name, value] of Object.entries({
  '--background': '#fff',
  '--foreground': '#171717',
  '--chart-1': 'oklch(0.646 0.222 41.116)',
  '--chart-2': 'oklch(0.6 0.118 184.704)',
  '--chart-3': 'oklch(0.398 0.07 227.392)',
  '--chart-4': 'oklch(0.828 0.189 84.429)',
  '--chart-5': 'oklch(0.769 0.188 70.08)',
})) {
  document.documentElement.style.setProperty(name, value)
}

document.body.style.background = '#fff'
document.body.style.color = '#171717'
document.body.style.fontFamily = 'Geist, sans-serif'
document.body.style.fontSize = '16px'

document.title = original ? 'Original Bklit Scatter' : 'Migrated TanStack Scatter'

document.documentElement.style.setProperty('--font-geist-sans', 'Geist')

const data = [120, 180, 150, 240, 210, 290, 180].map((revenue, index) => ({
  date: new Date(Date.UTC(2025, 0, index + 1)),
  revenue,
  cost: revenue * 6,
}))

const phaseChanged = (phase) => {
  document.documentElement.dataset.scatterPhases = `${document.documentElement.dataset.scatterPhases ?? ''}${phase},`
}

const Fixture = () => {
  const [alternate, setAlternate] = useState(false)
  const [mounted, setMounted] = useState(true)
  const [rows, setRows] = useState(data)
  const [signature, setSignature] = useState('')

  return (
    <>
      <nav>
        <button
          onClick={() => {
            setAlternate((value) => !value)
          }}
        >
          Change options
        </button>
        <button>Focus last</button>
        <button
          onClick={() => {
            setSignature('again')
          }}
        >
          Replay
        </button>
        <button
          onClick={() => {
            setRows([])
          }}
        >
          Empty
        </button>
        <button
          onClick={() => {
            setRows(data)
          }}
        >
          Restore
        </button>
        <button
          onClick={() => {
            setMounted(false)
          }}
        >
          Unmount
        </button>
        <button
          onClick={() => {
            setMounted(true)
          }}
        >
          Remount
        </button>
      </nav>
      <section id="scatter-fixture" style={{ width: 640, height: 320 }}>
        {mounted && (
          <ScatterChart
            data={rows}
            animationDuration={1100}
            revealSignature={signature}
            onPhaseChange={phaseChanged}
          >
            <Grid />
            {alternate ? (
              <Scatter
                dataKey="revenue"
                radius={7}
                stroke="navy"
                strokeWidth={3}
                ringGap={1}
                outlineWidth={2}
                yGradient={{ from: 'red', to: 'rgb(30, 150, 90)' }}
                fadeOnHover={false}
                showActiveHighlight={false}
              />
            ) : (
              <Scatter dataKey="revenue" />
            )}
            <Scatter
              dataKey="cost"
              radius={alternate ? 4 : undefined}
              strokeWidth={0}
              yAxisId="right"
            />
            <XAxis />
            <YAxis />
            <YAxis yAxisId="right" />
            <ChartTooltip />
          </ScatterChart>
        )}
      </section>
    </>
  )
}

await document.fonts.load('500 14px Geist')

createRoot(document.querySelector('#root')).render(<Fixture />)
