import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { GaugeProps } from '@charts-source/charts/gauge'
import fixtures from './fixtures.json'

const params = new URLSearchParams(location.search)
const original = params.get('implementation') === 'original'
const { Gauge } = original
  ? await import('@original-charts/gauge')
  : await import('@charts-source/charts/gauge')
if (original) await import('@original-globals')
else await import('@charts-source/charts/styles.css')
await import('./style.css')
document.title = original ? 'Original Bklit Gauge' : 'Migrated TanStack Gauge'
document.documentElement.style.setProperty('--font-geist-sans', 'Geist')
const fixture = fixtures.find((f) => f.id === (params.get('fixture') ?? 'arc'))
if (!fixture) throw new Error('Unknown fixture')
const configuration: GaugeProps = fixture.props
document.documentElement.classList.toggle('dark', params.get('theme') === 'dark')
document.body.classList.toggle('narrow', params.get('width') === '390')
function Baseline() {
  const [entranceConfiguration, setEntranceConfiguration] = useState(configuration)
  const [value, setValue] = useState(configuration.value)
  const [visible, setVisible] = useState(true)
  const [showCompanion, setShowCompanion] = useState(false)
  const [centerValue, setCenterValue] = useState(configuration.centerValue)
  const [notchCornerRadius, setNotchCornerRadius] = useState(configuration.notchCornerRadius ?? 0)
  const [notchLengthPercent, setNotchLengthPercent] = useState(
    configuration.notchLengthPercent ?? 100,
  )
  const [align, setAlign] = useState(configuration.labelAlign ?? 'start')
  return (
    <div>
      <nav>
        <button onClick={() => setValue(Math.max(0, value - 15))}>Decrease</button>
        <button onClick={() => setValue(Math.min(100, value + 15))}>Increase</button>
        <button onClick={() => setValue(configuration.value)}>Reset</button>
        <button
          onClick={() =>
            setAlign(align === 'start' ? 'center' : align === 'center' ? 'end' : 'start')
          }
        >
          Cycle label
        </button>
        <button onClick={() => setCenterValue((centerValue ?? 0) + 1000)}>Change center</button>
        <button onClick={() => setCenterValue((centerValue ?? 0) - 1000)}>Lower center</button>
        <button onClick={() => setVisible(!visible)}>{visible ? 'Unmount' : 'Remount'}</button>
        <button onClick={() => setNotchLengthPercent(notchLengthPercent === 40 ? 100 : 40)}>
          Toggle notch depth
        </button>
        <button
          onClick={() => {
            const { enterTransition, ...withoutTransition } = entranceConfiguration
            const slow = enterTransition?.type === 'tween' && enterTransition.duration === 1.2
            setEntranceConfiguration(
              slow
                ? withoutTransition
                : {
                    ...entranceConfiguration,
                    enterTransition: { type: 'tween', duration: 1.2, ease: 'easeInOut' },
                  },
            )
          }}
        >
          Toggle entrance transition
        </button>
        <button onClick={() => setNotchCornerRadius(notchCornerRadius === 4 ? 0 : 4)}>
          Toggle notch corners
        </button>
        <button onClick={() => setShowCompanion(!showCompanion)}>
          {showCompanion ? 'Hide companion' : 'Show companion'}
        </button>
      </nav>
      <div id="fixture">
        {visible ? (
          <Gauge
            {...entranceConfiguration}
            value={value}
            labelAlign={align}
            centerValue={centerValue}
            notchLengthPercent={notchLengthPercent}
            notchCornerRadius={notchCornerRadius}
          />
        ) : null}
        {visible && showCompanion ? (
          <Gauge
            {...configuration}
            enterTransition={{ type: 'tween', duration: 1.2, ease: 'easeInOut' }}
          />
        ) : null}
      </div>
      <div id="status">Value {value}</div>
    </div>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Missing root')
void document.fonts.load('700 30px Geist').then(() => createRoot(root).render(<Baseline />))
