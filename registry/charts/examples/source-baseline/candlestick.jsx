import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import '../family-consumer.css'

const parameters = new URLSearchParams(location.search)

const original = parameters.get('implementation') === 'original'

const { CandlestickChart } = original
  ? await import('@original-charts/candlestick-chart')
  : await import('@charts-source/charts/candlestick-chart')

const { Candlestick } = original
  ? await import('@original-charts/candlestick')
  : await import('@charts-source/charts/candlestick/carrier')

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

const { PatternLines } = original
  ? await import('@original-charts/visx-pattern')
  : await import('@charts-source/charts/kit/pattern/pattern-lines-view')

const patterned = parameters.get('details') === 'pattern'

const detailPaint = patterned
  ? {
      bodyPatternPositive: 'url(#body-lines)',
      bodyPatternNegative: 'url(#body-lines)',
      insideStrokeWidth: 0.5,
    }
  : {}

const candleOptions = {
  ...detailPaint,
  animate: parameters.get('animate') !== 'false',
  showHoverFade: parameters.get('fade') !== 'false',
}

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

document.title = original ? 'Original Bklit Candlestick' : 'Migrated TanStack Candlestick'

document.documentElement.style.setProperty('--font-geist-sans', 'Geist')

const enterTransition =
  parameters.get('entrance') === 'linear'
    ? { type: 'tween', duration: 0.6, ease: 'linear' }
    : undefined

const data = [
  { open: 120, high: 160, low: 100, close: 150 },
  { open: 150, high: 180, low: 125, close: 135 },
  { open: 135, high: 150, low: 110, close: 135 },
  { open: 135, high: 190, low: 130, close: 175 },
  { open: 175, high: 200, low: 150, close: 160 },
  { open: 160, high: 210, low: 155, close: 195 },
  { open: 195, high: 205, low: 165, close: 180 },
].map((values, index) => ({ ...values, date: new Date(Date.UTC(2025, 0, index + 1)) }))

const Fixture = () => {
  const [alternate, setAlternate] = useState(false)
  const [mounted, setMounted] = useState(true)
  const [rows, setRows] = useState(data)
  const [signature, setSignature] = useState('')
  const [domain, setDomain] = useState()

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
            setDomain([new Date(Date.UTC(2025, 0, 2)), new Date(Date.UTC(2025, 0, 5))])
          }}
        >
          Window
        </button>
        <button
          onClick={() => {
            setDomain(undefined)
          }}
        >
          Full range
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
      <section id="candlestick-fixture" style={{ width: 640, height: alternate ? 240 : 320 }}>
        {mounted && (
          <CandlestickChart
            data={rows}
            animationDuration={1100}
            enterTransition={enterTransition}
            revealSignature={signature}
            xDomain={domain}
            style={alternate ? { height: 240 } : undefined}
            candleWidth={alternate ? 14 : undefined}
            candleGap={alternate ? 0.7 : undefined}
          >
            {patterned && <PatternLines id="body-lines" width={4} height={4} stroke="white" />}
            <Grid />
            {alternate ? (
              <Candlestick
                {...candleOptions}
                positiveFill="rgb(0, 140, 100)"
                negativeFill="rgb(210, 40, 70)"
                fadedOpacity={0.2}
              />
            ) : (
              <Candlestick {...candleOptions} />
            )}
            <XAxis />
            <YAxis />
            <ChartTooltip />
          </CandlestickChart>
        )}
      </section>
    </>
  )
}

await document.fonts.load('500 14px Geist')

createRoot(document.querySelector('#root')).render(<Fixture />)
