import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
const query = new URLSearchParams(location.search)
const original = query.get('implementation') === 'original'
const matchCrosshair = query.has('matchCrosshair')
const axisCase = query.get('axis')
const entranceCase = query.get('entrance')
const squareMode = query.get('squares')
const mixed = axisCase === 'mixed'
const namedAxes = mixed || axisCase === 'dual'
const hasSquares = squareMode !== null || mixed
const initialHorizontal = query.has('horizontal')
const initialStacked = query.has('stacked')
function numericOption(name, second = false) {
  const raw = query.get(second ? `second${name[0]?.toUpperCase()}${name.slice(1)}` : name)
  if (raw === null) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}
function geometryOptions(second = false) {
  const minimum = numericOption('minimum', second)
  const gap = numericOption('gap', second)
  const stackGap = numericOption('stackGap', second)
  const raw = query.get(second ? 'secondRadius' : 'radius')
  const radius = raw === 'round' || raw === 'butt' ? raw : numericOption('radius', second)
  return {
    ...(minimum === undefined ? {} : { minBarHeight: minimum }),
    ...(gap === undefined ? {} : { groupGap: gap }),
    ...(stackGap === undefined ? {} : { stackGap }),
    ...(radius === undefined ? {} : { lineCap: radius }),
    ...(query.has(second ? 'secondPerspective' : 'perspective') ? { perspective: true } : {}),
  }
}
const firstGeometry = geometryOptions()
const secondGeometry = geometryOptions(true)
const showCompanion = query.has('two')
const variablePaint = query.has('variables')
const presets = ['none', 'diagonal', 'horizontal', 'vertical', 'cross', 'dots', 'circles', 'accent']
const requestedPreset = query.get('preset')
const preset =
  squareMode === 'none' ? 'none' : presets.includes(requestedPreset) ? requestedPreset : 'dots'
const enterTransition = (() => {
  switch (entranceCase) {
    case 'linear':
      return { type: 'tween', duration: 0.6, ease: 'linear' }
    case 'spring':
      return { type: 'spring', stiffness: 100, damping: 12 }
    case 'function':
      return { type: 'tween', duration: 0.6, ease: (progress) => progress * progress }
    default:
      return undefined
  }
})()
const barEntrance =
  entranceCase === 'none'
    ? { animate: false }
    : entranceCase === 'fade'
      ? { animationType: 'fade' }
      : {}
const { YAxis } = original
  ? await import('@original-charts/y-axis')
  : await import('@charts-source/charts/kit/cartesian/carriers')
const { ChartConfigProvider } = await import('@original-charts/chart-config-context')
const { BarChart } = original
  ? await import('@original-charts/bar-chart')
  : await import('@charts-source/charts/bar-chart')
const { Bar } = original
  ? await import('@original-charts/bar')
  : await import('@charts-source/charts/bar/carriers')
const { BarSquares } = original
  ? await import('@original-charts/bar-squares')
  : await import('@charts-source/charts/bar/carriers')
const { BarColumnTrack } = original
  ? await import('@original-charts/bar-squares')
  : await import('@charts-source/charts/bar/carriers')
const { BarDepthProvider, BarDepthBack, BarDepthFront, BarPulse } = original
  ? await import('@original-charts/bar-depth')
  : await import('@charts-source/charts/bar/carriers')
const { PatternCircles } = await import('@original-charts/visx-pattern')
const { BarXAxis } = original
  ? await import('@original-charts/bar-x-axis')
  : await import('@charts-source/charts/bar/carriers')
const { BarYAxis } = original
  ? await import('@original-charts/bar-y-axis')
  : await import('@charts-source/charts/bar/carriers')
const { Grid } = original
  ? await import('@original-charts/grid')
  : await import('@charts-source/charts/kit/cartesian/carriers')
const { ChartTooltip } = original
  ? await import('@original-charts/tooltip/chart-tooltip')
  : await import('@charts-source/charts/kit/cartesian/carriers')
if (original) await import('@original-globals')
else await import('@charts-source/charts/styles.css')
await import('./style.css')
document.title = original ? 'Original Bklit Bar' : 'Migrated TanStack Bar'
document.documentElement.style.setProperty('--font-geist-sans', 'Geist')
const revenues =
  query.get('values') === 'small'
    ? [0, 0.01, 20, 80, 40, 100, 5]
    : query.get('values') === 'signed'
      ? [-20, 0, 10, 40, 80, 100, 5]
      : [120, 180, 150, 240, 210, 290, 180]
const data = Array.from({ length: query.has('many') ? 70 : revenues.length }, (_, index) => {
  const revenue = revenues[index % revenues.length] ?? 120

  return { name: `Group ${index + 1}`, revenue, cost: revenue * (namedAxes ? 60 : 0.6) }
})
function Fixture() {
  const [alternate, setAlternate] = useState(false)
  const [rows, setRows] = useState(data)
  const [mounted, setMounted] = useState(true)
  const [epoch, setEpoch] = useState(0)
  const [gradient, setGradient] = useState(squareMode !== 'plain')
  const [narrow, setNarrow] = useState(false)
  function chart(companion) {
    const start = companion ? '#18a878' : '#ff5500'
    const end = companion ? '#c040df' : '#2864e8'
    const paintStart = variablePaint ? 'var(--bar-paint-start)' : start
    const paintEnd = variablePaint ? 'var(--bar-paint-end)' : end
    const patternId = companion ? 'bar-paint-companion' : 'bar-paint'
    const fill =
      squareMode === 'gradient' || squareMode === 'fallback' ? paintStart : `url(#${patternId})`
    const stops =
      squareMode === 'fallback'
        ? [{ offset: 50, color: 'orange' }]
        : [
            { offset: 0, color: paintStart },
            { offset: 100, color: paintEnd },
          ]
    return (
      <section
        id={companion ? 'bar-companion' : 'bar-fixture'}
        style={
          !hasSquares
            ? { width: 640, height: 320 }
            : {
                width: narrow ? 420 : 640,
                ...(variablePaint ? { '--bar-paint-start': start, '--bar-paint-end': end } : {}),
              }
        }
      >
        {mounted && (
          <BarChart
            key={epoch}
            data={rows}
            xDataKey="name"
            animationDuration={1100}
            barWidth={numericOption('barWidth')}
            enterTransition={enterTransition}
            orientation={initialHorizontal !== alternate ? 'horizontal' : 'vertical'}
            stacked={initialStacked !== alternate}
            stackGap={numericOption('tooltipGap') ?? (alternate ? 2 : 0)}
          >
            <Grid />
            {!hasSquares ? (
              <>
                <Bar
                  {...barEntrance}
                  dataKey="revenue"
                  fill={alternate ? 'navy' : undefined}
                  lineCap={alternate ? 'butt' : undefined}
                  {...firstGeometry}
                />
                <Bar
                  {...barEntrance}
                  dataKey="cost"
                  fill="rgb(30, 150, 90)"
                  yAxisId={namedAxes ? 'right' : undefined}
                  {...secondGeometry}
                />
              </>
            ) : (
              <>
                <PatternCircles id={patternId} width={8} height={8} radius={2} fill={paintStart} />
                {mixed ? (
                  <Bar {...barEntrance} dataKey="revenue" {...firstGeometry} />
                ) : (
                  <BarSquares
                    dataKey="revenue"
                    fill={fill}
                    stroke={start}
                    useGradient={gradient}
                    gradientStops={stops}
                    patternPreset={preset}
                    animate={entranceCase !== 'none'}
                  />
                )}
                <BarSquares
                  dataKey="cost"
                  fill="#aaa"
                  animate={entranceCase !== 'none'}
                  yAxisId={namedAxes ? 'right' : undefined}
                />
              </>
            )}
            {query.has('track') && <BarColumnTrack />}
            {!query.has('depth') && numericOption('pulse') !== undefined && (
              <BarPulse
                dataKey="revenue"
                activeIndex={numericOption('pulse')}
                pulsePaused={query.has('pausePulse')}
              />
            )}
            {query.has('depth') && (
              <BarDepthProvider
                minBarHeight={numericOption('depthMinimum') ?? 0}
                segmentsAccessor={
                  query.has('segments')
                    ? (row) => [
                        { value: row.revenue * 0.4, color: '#ff5500' },
                        { value: row.revenue * 0.6, color: '#2864e8' },
                      ]
                    : undefined
                }
              >
                <BarDepthBack dataKey="revenue" />
                <BarDepthFront dataKey="revenue" />
                {numericOption('pulse') !== undefined && (
                  <BarPulse
                    dataKey="revenue"
                    activeIndex={numericOption('pulse')}
                    pulsePaused={query.has('pausePulse')}
                  />
                )}
              </BarDepthProvider>
            )}
            {initialHorizontal !== alternate ? <BarYAxis /> : <BarXAxis />}
            {namedAxes && (
              <YAxis yAxisId="right" orientation="right" formatValue={(value) => `$${value}`} />
            )}
            {!alternate && axisCase === 'both' && <BarYAxis />}
            {!alternate && axisCase === 'numeric' && <YAxis formatValue={(value) => `$${value}`} />}
            <ChartTooltip matchCrosshair={matchCrosshair} />
          </BarChart>
        )}
      </section>
    )
  }
  return (
    <>
      <nav>
        <button onClick={() => setAlternate((value) => !value)}>Change options</button>
        <button onClick={() => setEpoch((value) => value + 1)}>Replay</button>
        <button onClick={() => setRows([])}>Empty</button>
        <button onClick={() => setRows(data)}>Restore</button>
        <button onClick={() => setMounted(false)}>Unmount</button>
        <button onClick={() => setMounted(true)}>Remount</button>
        {hasSquares && (
          <>
            <button onClick={() => setGradient((value) => !value)}>Toggle gradient</button>
            <button onClick={() => setNarrow((value) => !value)}>Resize</button>
          </>
        )}
      </nav>
      {chart(false)}
      {hasSquares && showCompanion && chart(true)}
    </>
  )
}
await document.fonts.load('500 14px Geist')
createRoot(document.getElementById('root')).render(
  original && matchCrosshair ? (
    <ChartConfigProvider value={{ tooltipSpring: { stiffness: 40, damping: 12 } }}>
      <Fixture />
    </ChartConfigProvider>
  ) : (
    <Fixture />
  ),
)
