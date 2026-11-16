import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Chart } from '@tanstack/react-charts/core'
import { defineChart, lineY } from '@tanstack/charts'
import { d3Curve } from '@tanstack/charts/d3/shape'
import { motion } from '@tanstack/charts/motion'
import { curveNatural } from 'd3-shape'
import { scaleLinear, scaleUtc } from '@charts-source/charts/kit/scales'
import '@charts-source/charts/styles.css'
import './style.css'

const data = [10, 35, 20].map((value, index) => ({
  date: new Date(Date.UTC(2026, 0, index + 1)),
  value,
}))
const renderer = motion({ respectReducedMotion: true })
function Control() {
  const [focused, setFocused] = useState<number | null>(null)
  const definition = useMemo(
    () =>
      defineChart({
        margin: 40,
        focus: 'group-x',
        tooltip: false,
        focusRing: {},
        marks: [
          lineY(data, {
            id: 'line:value',
            x: (row) => row.date,
            y: (row) => row.value,
            z: () => 'value',
            key: (row) => row.date.getTime(),
            stroke: 'var(--chart-line-primary)',
            strokeWidth: 2.5,
            curve: d3Curve(curveNatural),
          }),
        ],
        scales: {
          x: { scale: scaleUtc().domain([data[0].date, data[2].date]), axis: false },
          y: { scale: scaleLinear().domain([0, 40]), axis: false },
        },
        theme: {
          foreground: 'var(--chart-foreground)',
          muted: 'var(--chart-label)',
          grid: 'var(--chart-grid)',
          background: 'transparent',
          palette: ['var(--chart-1)'],
        },
      }),
    [],
  )
  return (
    <div>
      <div id="fixture">
        <Chart
          renderer={renderer}
          definition={definition}
          ariaLabel="Frozen typed Cartesian engine control"
          width={640}
          height={320}
          onFocusChange={(point) => setFocused(point?.datumIndex ?? null)}
        />
      </div>
      <output id="status">Rows 3; focused {focused ?? 'none'}</output>
    </div>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Missing root')
void document.fonts.load('700 30px Geist').then(() => createRoot(root).render(<Control />))
