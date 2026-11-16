import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
const original = new URLSearchParams(location.search).get('implementation') === 'original'
const { RadarChart } = original
  ? await import('@original-charts/radar-chart')
  : await import('@charts-source/charts/radar-chart')
const { RadarArea } = original
  ? await import('@original-charts/radar-area')
  : await import('@charts-source/charts/radar-chart')
const { RadarGrid } = original
  ? await import('@original-charts/radar-grid')
  : await import('@charts-source/charts/radar-chart')
const { RadarAxis } = original
  ? await import('@original-charts/radar-axis')
  : await import('@charts-source/charts/radar-chart')
const { RadarLabels } = original
  ? await import('@original-charts/radar-labels')
  : await import('@charts-source/charts/radar-chart')
const { FunnelChart } = original
  ? await import('@original-charts/funnel-chart')
  : await import('@charts-source/charts/funnel-chart')
if (original) await import('@original-globals')
else await import('@charts-source/charts/styles.css')
await import('./style.css')
await import('../src/noncart-controls.css')
document.title = original ? 'Original Bklit Radar and Funnel' : 'Migrated TanStack Radar and Funnel'
document.documentElement.style.setProperty('--font-geist-sans', 'Geist')
const flags = new URLSearchParams(window.location.search)
const fluid = flags.has('fluid'),
  zero = flags.has('zero'),
  controlled = flags.has('controlled')
const metrics = [
  { key: 'a', label: 'Speed' },
  { key: 'b', label: 'Safety' },
  { key: 'c', label: 'Range' },
  { key: 'd', label: 'Comfort' },
  { key: 'e', label: 'Price' },
]
const radarData = [
  { label: 'North', values: { a: 80, b: 60, c: 70, d: 50, e: 90 } },
  { label: 'South', values: { a: 50, b: 80, c: 40, d: 90, e: 65 } },
]
const manyRadarMetrics = Array.from({ length: 25 }, (_, index) => ({
  key: `metric${index}`,
  label: `Metric ${index + 1}`,
}))
const manyRadarData = radarData.map((row, series) => ({
  label: row.label,
  values: Object.fromEntries(
    manyRadarMetrics.map((metric, index) => [metric.key, 35 + ((index * 13 + series * 17) % 55)]),
  ),
}))
const funnelData = [
  { label: 'Visitors', value: 10000 },
  { label: 'Interested', value: 6500 },
  { label: 'Qualified', value: 3200 },
  { label: 'Customers', value: 1200 },
]
const manyFunnelStages = Array.from({ length: 25 }, (_, index) => ({
  label: `Stage ${index + 1}`,
  value: 10000 - index * 300,
}))
const enterTransition =
  flags.get('enter') === 'spring'
    ? { type: 'spring', stiffness: 100, damping: 8 }
    : flags.get('enter') === 'linear'
      ? { duration: 0.7, ease: 'linear' }
      : flags.get('enter') === 'function'
        ? { duration: 0.7, ease: (value) => value * value }
        : undefined
function Fixture() {
  const [alternate, setAlternate] = useState(false),
    [empty, setEmpty] = useState(false),
    [manyStages, setManyStages] = useState(false),
    [manyRadar, setManyRadar] = useState(false),
    [deepLayers, setDeepLayers] = useState(false),
    [funnelFocus, setFunnelFocus] = useState(undefined),
    [visible, setVisible] = useState(true),
    [focus, setFocus] = useState(controlled ? 1 : undefined)
  const normalLayers = alternate ? 2 : 3
  const normalLevels = alternate ? 3 : 5
  const radarRows = manyRadar ? manyRadarData : radarData
  return (
    <>
      <style>{'.radar-demo-short{height:200px}'}</style>
      <nav className="noncart-controls">
        <button onClick={() => setAlternate((v) => !v)}>Change options</button>
        <button onClick={() => setEmpty(true)}>Empty</button>
        <button
          onClick={() => {
            setEmpty(false)
            setManyStages(false)
            setManyRadar(false)
          }}
        >
          Restore
        </button>
        <button onClick={() => setVisible((v) => !v)}>Toggle mount</button>
        <button
          onClick={() => {
            setFocus(0)
            setFunnelFocus(undefined)
          }}
        >
          Focus first
        </button>
        <button
          onClick={() => {
            setFocus(1)
            setFunnelFocus(undefined)
          }}
        >
          Focus second
        </button>
        <button
          onClick={() => {
            setFocus(null)
            setFunnelFocus(undefined)
          }}
        >
          Clear focus
        </button>
      </nav>
      <section
        id="radar-fixture"
        style={{ width: fluid ? '100%' : 320, maxWidth: 320, minHeight: 320 }}
      >
        {visible ? (
          <RadarChart
            data={empty ? [] : radarRows}
            className={flags.has('short') ? 'radar-demo-short' : ''}
            metrics={manyRadar ? manyRadarMetrics : metrics}
            size={zero ? 0 : fluid ? undefined : alternate ? 280 : 320}
            levels={manyRadar ? 13 : normalLevels}
            margin={alternate ? 40 : 60}
            staggerScale={alternate ? 0.5 : 1}
            animate={!flags.has('still')}
            hoveredIndex={focus}
          >
            {alternate
              ? [
                  <RadarGrid stroke="purple" showLabels={false} />,
                  <RadarAxis strokeOpacity={0.3} />,
                  <RadarLabels offset={18} fontSize={12} />,
                  <RadarArea
                    index={0}
                    color="purple"
                    showPoints={false}
                    showStroke={false}
                    showGlow={false}
                  />,
                  <RadarArea index={1} />,
                ]
              : [
                  <RadarGrid />,
                  <RadarAxis />,
                  <RadarLabels interactive />,
                  <RadarArea index={0} />,
                  <RadarArea index={1} />,
                ]}
          </RadarChart>
        ) : null}
      </section>
      <section
        id="funnel-fixture"
        style={{ width: fluid ? '100%' : 320, maxWidth: 320, minHeight: 320 }}
      >
        {visible ? (
          <FunnelChart
            data={empty ? [] : manyStages ? manyFunnelStages : funnelData}
            enterTransition={enterTransition}
            hoveredIndex={funnelFocus === undefined ? focus : funnelFocus}
            orientation={flags.has('vertical') ? 'vertical' : 'horizontal'}
            layers={deepLayers ? 10 : normalLayers}
            gap={alternate ? 12 : 4}
            edges={alternate ? 'straight' : 'curved'}
            grid={alternate}
            labelLayout={alternate || flags.has('grouped') ? 'grouped' : 'spread'}
            labelOrientation={alternate ? 'horizontal' : undefined}
            labelAlign={alternate ? 'end' : 'center'}
            showPercentage={!alternate}
            color={alternate ? 'purple' : undefined}
            formatValue={alternate ? (value) => `$${value}` : undefined}
          />
        ) : null}
      </section>
      <nav className="noncart-controls">
        <button
          aria-pressed={manyStages}
          onClick={() => {
            setManyStages((value) => !value)
            setEmpty(false)
          }}
        >
          25 Funnel stages
        </button>
        <button onClick={() => setFunnelFocus(manyStages ? 24 : 3)}>Focus last stage</button>
        <button aria-pressed={deepLayers} onClick={() => setDeepLayers((value) => !value)}>
          10 Funnel layers
        </button>
        <button
          aria-pressed={manyRadar}
          onClick={() => {
            setManyRadar((value) => !value)
            setEmpty(false)
          }}
        >
          25 Radar metrics / 13 levels
        </button>
      </nav>
    </>
  )
}
await document.fonts.load('500 14px Geist')
createRoot(document.getElementById('root')).render(<Fixture />)
