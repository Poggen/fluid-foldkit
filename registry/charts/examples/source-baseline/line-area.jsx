import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
const showcaseOptions = new URLSearchParams(location.search)
const original = showcaseOptions.get('implementation') === 'original'
const crosshairCases = {
  top: { indicatorFadeEdges: 'top', indicatorFadeLength: 25 },
  bottom: { indicatorFadeEdges: 'bottom', indicatorFadeLength: 90 },
  both: { indicatorFadeEdges: 'both', indicatorFadeLength: 0 },
  none: { indicatorFadeEdges: 'none' },
  dashed: { indicatorFadeEdges: 'top', indicatorFadeLength: 25, indicatorDasharray: '6,4' },
}
const crosshairMode = showcaseOptions.get('crosshairFade')
const crosshairOptions = Object.hasOwn(crosshairCases, crosshairMode)
  ? crosshairCases[crosshairMode]
  : {}

const showHighlight = !showcaseOptions.has('noHighlight')
const hasTooltip = !showcaseOptions.has('noTooltip')
const indicatorColor = showcaseOptions.has('indicatorColor')
  ? (point) => (Number(point.revenue) >= 200 ? 'rgb(200, 0, 100)' : 'rgb(0, 100, 220)')
  : undefined
const dotColor = showcaseOptions.has('dotColor')
  ? (point) => (Number(point.revenue) >= 200 ? 'rgb(200, 0, 100)' : 'rgb(0, 100, 220)')
  : undefined
const dotOptions = {
  ...(showcaseOptions.has('dotRing')
    ? {
        dotVariant: 'ring',
        dotSize: 7,
        dotScale: 1.4,
        dotRadiusFraction: 0.12,
        dotStrokeWidth: 3,
      }
    : {}),
  ...(showcaseOptions.has('dotRows')
    ? {
        rows: (point) => [
          { color: 'rgb(30, 150, 80)', label: 'Revenue', value: Number(point.revenue) },
        ],
      }
    : {}),
}
const enterTransition = showcaseOptions.has('enterTransition')
  ? { type: 'tween', duration: 0.6, delay: 0.2, ease: 'linear' }
  : undefined
const { LineChart } = original
  ? await import('@original-charts/line-chart')
  : await import('@charts-source/charts/line-chart')
const { AreaChart } = original
  ? await import('@original-charts/area-chart')
  : await import('@charts-source/charts/area-chart')
const PrimaryChart = showcaseOptions.get('primary') === 'area' ? AreaChart : LineChart
const { useChartStable } = original
  ? await import('@original-charts/chart-context')
  : await import('@charts-source/charts/kit/cartesian/chart-context')
const { ChartTooltip, Line, Area, Grid, XAxis, YAxis } = original
  ? await import('@original-charts/index')
  : await import('@charts-source/charts/kit/cartesian/carriers')
if (original) await import('@original-globals')
else await import('@charts-source/charts/styles.css')
await import('./style.css')
await import('../src/line-area-controls.css')
document.title = original ? 'Original Bklit Line and Area' : 'Migrated TanStack Line and Area'
document.documentElement.style.setProperty('--font-geist-sans', 'Geist')
const values = showcaseOptions.has('dense')
  ? Array.from({ length: 64 }, (_, index) => 120 + ((index * 37) % 170))
  : [120, 180, 150, 240, 210, 290, 180]
const data = values.map((revenue, index) => ({
  date: new Date(Date.UTC(2025, 0, index + 1)),
  revenue,
  cost: revenue * 0.6,
}))
const missingAreaData = data.map((row, index) => {
  if (index === 2) return { ...row, revenue: null }
  if (index === 4) return { date: row.date, cost: row.cost }
  return row
})
const updatedData = data.map((row, index) => (index === 2 ? { ...row, revenue: 190 } : row))
const defaultPhase = (phase) =>
  document.dispatchEvent(
    new CustomEvent('fixture-phase', { detail: { variant: 'default', phase } }),
  )
const alternatePhase = (phase) =>
  document.dispatchEvent(
    new CustomEvent('fixture-phase', { detail: { variant: 'alternate', phase } }),
  )
const pulseCycle = () => {
  document.documentElement.dataset.pulseCycles = String(
    Number(document.documentElement.dataset.pulseCycles ?? '0') + 1,
  )
}
function ContextReadout() {
  const { chartStatus, chartPhase } = useChartStable()
  return (
    <text id="line-context" x="4" y="18">
      {chartStatus}/{chartPhase}
    </text>
  )
}
function Fixture() {
  const [status, setStatus] = useState('ready')
  const [rows, setRows] = useState(data)
  const [signature, setSignature] = useState('')
  const [alternate, setAlternate] = useState(false)
  const [sweep, setSweep] = useState(false)
  const [domain, setDomain] = useState(undefined)
  const [mounted, setMounted] = useState(true)
  const [missingArea, setMissingArea] = useState(false)
  return (
    <>
      <nav className="line-area-controls">
        <button onClick={() => setStatus('loading')}>Loading</button>
        <button onClick={() => setStatus('ready')}>Ready</button>
        <button
          onClick={() => {
            setRows(data.slice(0, 3))
            setMissingArea(false)
          }}
        >
          Shrink
        </button>
        <button onClick={() => setSignature('again')}>Replay</button>
        <button>Focus fifth</button>
        <button
          onClick={() => {
            setRows(data)
            setMissingArea(false)
          }}
        >
          Reset data
        </button>
        <button>Clear focus</button>
        <button
          onClick={() =>
            setDomain([new Date(Date.UTC(2025, 0, 2)), new Date(Date.UTC(2025, 0, 5))])
          }
        >
          Zoom middle
        </button>
        <button onClick={() => setDomain(undefined)}>Full range</button>
        <button onClick={() => setAlternate((value) => !value)}>Change inputs</button>
        <button onClick={() => setSweep((value) => !value)}>Sweep style</button>
        <button
          onClick={() => {
            setRows(updatedData)
            setMissingArea(false)
          }}
        >
          Values
        </button>
        {showcaseOptions.has('lifecycle') && (
          <button onClick={() => setMounted((value) => !value)}>
            {mounted ? 'Unmount primary' : 'Remount primary'}
          </button>
        )}
      </nav>
      <section
        id="line-fixture"
        style={{ width: alternate ? 480 : 640, height: alternate ? 240 : 320 }}
      >
        {mounted && (
          <PrimaryChart
            data={rows}
            xDomain={domain}
            status={status}
            revealSignature={signature}
            animationDuration={1100}
            enterTransition={enterTransition}
            onPhaseChange={alternate ? alternatePhase : defaultPhase}
            loadingLabel={alternate ? 'Updating chart' : ''}
            style={alternate ? { backgroundColor: 'rgb(240, 245, 250)' } : undefined}
          >
            <Grid horizontal />
            {alternate ? (
              <Line
                dataKey="cost"
                stroke="rgb(20, 110, 180)"
                loadingStyle={sweep ? 'sweep' : 'pulse'}
              />
            ) : showcaseOptions.get('primary') === 'area' ? (
              <Area dataKey="revenue" showMarkers showHighlight={showHighlight} />
            ) : (
              <Line
                dataKey="revenue"
                showMarkers
                showHighlight={showHighlight}
                loadingStyle={sweep ? 'sweep' : 'pulse'}
                onLoadingPulseCycleComplete={pulseCycle}
              />
            )}
            <XAxis />
            <YAxis />
            {hasTooltip && (
              <ChartTooltip
                showDatePill={!alternate}
                indicatorColor={indicatorColor}
                dotColor={dotColor}
                {...dotOptions}
                {...crosshairOptions}
              />
            )}
            {showcaseOptions.has('context') && <ContextReadout />}
          </PrimaryChart>
        )}
      </section>
      <section id="area-fixture" style={{ width: 640, height: 320 }}>
        <AreaChart
          data={missingArea ? missingAreaData : rows}
          animationDuration={1100}
          enterTransition={enterTransition}
        >
          <Grid horizontal />
          <Area dataKey="revenue" fill="var(--chart-1)" showHighlight={showHighlight} />
          <XAxis />
          <YAxis />
          {hasTooltip && (
            <ChartTooltip
              indicatorColor={indicatorColor}
              dotColor={dotColor}
              {...dotOptions}
              {...crosshairOptions}
            />
          )}
        </AreaChart>
      </section>
      <nav className="line-area-controls">
        <button aria-pressed={missingArea} onClick={() => setMissingArea((value) => !value)}>
          Missing Area observations
        </button>
      </nav>
    </>
  )
}
await document.fonts.load('500 14px Geist')
const ActiveFixture =
  showcaseOptions.has('publicPulse') && original
    ? (await import('./public-pulse')).PublicPulse
    : Fixture
createRoot(document.getElementById('root')).render(<ActiveFixture />)
