import React, { useCallback, useState } from 'react'
import { LineChart } from '@original-charts/line-chart'
import { Line } from '@original-charts/line'
import { LineLoadingPulseStroke } from '@original-charts/line-loading-pulse'

const pathD = 'M0,80C80,10,160,120,240,60S320,20,400,80'
const data = [0, 1].map((value) => ({ date: new Date(Date.UTC(2025, 0, value + 1)), value }))
const buttonStyle = { border: '2px outset black', background: 'ButtonFace', color: 'ButtonText' }
const pulseStroke = new URLSearchParams(location.search).has('pulseStroke')
  ? { stroke: 'var(--chart-1)', strokeOpacity: 1, strokeWidth: 3 }
  : {}

/** Real frozen public component, hosted by its real chart provider. */
export function PublicPulse() {
  const [epoch, setEpoch] = useState(0)
  const [cycles, setCycles] = useState(0)
  const [mode, setMode] = useState('loop')
  const [visible, setVisible] = useState(true)
  const completed = useCallback(() => setCycles((value) => value + 1), [])
  return (
    <section id="public-loading-segment-consumer" style={{ lineHeight: 'normal' }}>
      <h2 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '0.83em 0' }}>
        Public loading and selection parts
      </h2>
      <nav>
        <button
          id="public-loading-replay"
          style={buttonStyle}
          onClick={() => {
            setMode('loop')
            setEpoch((value) => value + 1)
          }}
        >
          Replay first pulse
        </button>
        <button style={buttonStyle} onClick={() => setMode('enter')}>
          Enter first pulse
        </button>
        <button style={buttonStyle} onClick={() => setMode('exit')}>
          Exit first pulse
        </button>
        <button style={buttonStyle} onClick={() => setVisible((value) => !value)}>
          {visible ? 'Unmount first pulse' : 'Remount first pulse'}
        </button>
      </nav>
      <div style={{ position: 'relative', width: 400, height: 140 }}>
        <LineChart
          data={data}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          animationDuration={0}
          aspectRatio=""
          style={{ width: 400, height: 140 }}
        >
          <Line dataKey="value" stroke="transparent" showHighlight={false} />
          {visible && (
            <LineLoadingPulseStroke
              {...pulseStroke}
              pathD={pathD}
              mode={mode}
              loopEpoch={epoch}
              onCycleComplete={completed}
            />
          )}
          <LineLoadingPulseStroke
            {...pulseStroke}
            pathD={pathD}
            stroke="var(--chart-2)"
            onCycleComplete={completed}
          />
        </LineChart>
      </div>
      <output id="public-pulse-state">
        Cycles {cycles}; epoch {epoch}
      </output>
    </section>
  )
}
