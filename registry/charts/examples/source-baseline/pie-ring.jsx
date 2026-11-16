import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
const original = new URLSearchParams(location.search).get('implementation') === 'original'
const { PieChart } = original
  ? await import('@original-charts/pie-chart')
  : await import('@charts-source/charts/pie-chart')
const { PieSlice } = original
  ? await import('@original-charts/pie-slice')
  : await import('@charts-source/charts/pie/model')
const { PieCenter } = original
  ? await import('@original-charts/pie-center')
  : await import('@charts-source/charts/pie/center')
const { RingChart } = original
  ? await import('@original-charts/ring-chart')
  : await import('@charts-source/charts/ring-chart')
const { Ring } = original
  ? await import('@original-charts/ring')
  : await import('@charts-source/charts/ring-chart')
const { RingCenter } = original
  ? await import('@original-charts/ring-center')
  : await import('@charts-source/charts/ring/center')
if (original) await import('@original-globals')
else await import('@charts-source/charts/styles.css')
await import('./style.css')
await import('../src/noncart-controls.css')
document.title = original ? 'Original Bklit Pie and Ring' : 'Migrated TanStack Pie and Ring'
document.documentElement.style.setProperty('--font-geist-sans', 'Geist')
const flags = new URLSearchParams(window.location.search)
const fluid = flags.has('fluid'),
  scrub = flags.has('scrub'),
  controlled = flags.has('controlled')
const many = flags.has('many')
const pieData = many
  ? Array.from({ length: 40 }, (_, index) => ({ label: `Group ${index + 1}`, value: 30 }))
  : [
      { label: 'North', value: 40 },
      { label: 'South', value: 30 },
      { label: 'East', value: 20 },
      { label: 'West', value: 10 },
    ]
const ringData = pieData.map((d) => ({ ...d, maxValue: 50 }))
const ringEnter = flags.get('enter')
const ringTransition =
  ringEnter === 'instant'
    ? { type: 'tween', duration: 0 }
    : ringEnter === 'spring'
      ? { type: 'spring', stiffness: 100, damping: 8 }
      : ringEnter === 'linear'
        ? { type: 'tween', duration: 0.8, ease: 'linear' }
        : ringEnter === 'function'
          ? { type: 'tween', duration: 0.8, ease: (value) => value * value }
          : undefined

function Fixture() {
  const [centerClass, setCenterClass] = useState(undefined)
  const [alternate, setAlternate] = useState(false),
    [empty, setEmpty] = useState(false),
    [changedValues, setChangedValues] = useState(false),
    [visible, setVisible] = useState(true),
    [focus, setFocus] = useState(controlled ? 1 : undefined)
  const values = changedValues
    ? pieData.map((datum, index) => ({ ...datum, value: datum.value + (index === 0 ? 15 : 0) }))
    : pieData
  const rings = changedValues
    ? values.map((datum, index) => ({
        ...datum,
        value: datum.value + (index === 1 ? 5 : 0),
        maxValue: 50,
      }))
    : ringData
  return (
    <>
      <nav className="noncart-controls">
        <button
          onClick={() => {
            setCenterClass('ts-bkm-fixture-center-value')
            setAlternate(false)
          }}
        >
          Custom value class
        </button>
        <button
          onClick={() => {
            setCenterClass('')
            setAlternate(false)
          }}
        >
          Empty value class
        </button>
        <button
          onClick={() => {
            setCenterClass(undefined)
            setAlternate(false)
          }}
        >
          Default value class
        </button>
        <button onClick={() => setAlternate((v) => !v)}>Change options</button>
        <button onClick={() => setChangedValues(true)}>Change values</button>
        <button onClick={() => setEmpty(true)}>Empty</button>
        <button
          onClick={() => {
            setEmpty(false)
            setChangedValues(false)
          }}
        >
          Restore
        </button>
        <button onClick={() => setVisible((v) => !v)}>Toggle mount</button>
        <button onClick={() => setFocus(0)}>Focus first</button>
        <button onClick={() => setFocus(1)}>Focus second</button>
        {many ? <button onClick={() => setFocus(pieData.length - 1)}>Focus last</button> : null}
        <button onClick={() => setFocus(null)}>Clear focus</button>
      </nav>
      <section id="pie-fixture" style={{ width: fluid ? '100%' : 320, maxWidth: 320, height: 320 }}>
        {visible ? (
          <PieChart
            data={empty ? [] : values}
            size={fluid ? undefined : alternate ? 280 : 320}
            geometryScrubbing={scrub}
            innerRadius={alternate ? 50 : 70}
            padAngle={alternate ? 0.05 : 0}
            cornerRadius={alternate ? 8 : 0}
            startAngle={alternate ? 0 : undefined}
            endAngle={alternate ? Math.PI * 1.5 : undefined}
            hoveredIndex={focus}
          >
            {alternate
              ? [
                  <PieSlice index={0} fill="purple" hoverEffect="none" />,
                  <PieCenter prefix="$" defaultLabel="Revenue" />,
                ]
              : [
                  ...(many
                    ? pieData.map((_, index) => (
                        <PieSlice key={`slice-${index}`} index={index} hoverEffect="translate" />
                      ))
                    : [
                        <PieSlice index={0} hoverEffect="grow" />,
                        <PieSlice index={1} hoverEffect="translate" />,
                      ]),
                  <PieCenter valueClassName={centerClass} />,
                ]}
          </PieChart>
        ) : null}
      </section>
      <section
        id="ring-fixture"
        style={{ width: fluid ? '100%' : 320, maxWidth: 320, height: 320 }}
      >
        {visible ? (
          <RingChart
            enterTransition={ringTransition}
            data={empty ? [] : rings}
            size={fluid ? undefined : alternate ? 280 : 320}
            geometryScrubbing={scrub}
            strokeWidth={alternate ? 22 : 12}
            ringGap={alternate ? 3 : 6}
            baseInnerRadius={alternate ? 45 : 60}
            startAngle={alternate ? 0 : undefined}
            endAngle={alternate ? Math.PI * 1.5 : undefined}
            hoveredIndex={focus}
          >
            {alternate
              ? [
                  <Ring index={0} color="purple" animate={false} />,
                  <RingCenter suffix="%" defaultLabel="Progress" />,
                ]
              : [
                  ...(many
                    ? ringData.map((_, index) => (
                        <Ring
                          key={`ring-${index}`}
                          index={index}
                          lineCap="butt"
                          showGlow={!flags.has('noGlow')}
                        />
                      ))
                    : [
                        ...(flags.has('two') ? [<Ring index={0} />] : []),
                        <Ring index={1} lineCap="butt" showGlow={!flags.has('noGlow')} />,
                      ]),
                  <RingCenter valueClassName={centerClass} />,
                ]}
          </RingChart>
        ) : null}
      </section>
    </>
  )
}
await document.fonts.load('500 14px Geist')
createRoot(document.getElementById('root')).render(<Fixture />)
