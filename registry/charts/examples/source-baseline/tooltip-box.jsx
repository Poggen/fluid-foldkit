import React, { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig, useMotionValue } from '@original-motion'
import { ChartConfigProvider } from '@original-charts/chart-config-context'
import { TooltipBox } from '@original-charts/tooltip/tooltip-box'
import { TooltipContent } from '@original-charts/tooltip/tooltip-content'
import '@original-globals'
import './style.css'
document.documentElement.style.setProperty('--font-geist-sans', 'Geist')
const query = new URLSearchParams(location.search)
const reducedPolicy = query.get('reducedPolicy')
const reducedMotion =
  reducedPolicy === 'user' || reducedPolicy === 'always' ? reducedPolicy : 'never'
const positionSource = query.has('positionSource')
const config = query.has('customSpring')
  ? { tooltipBoxSpring: { stiffness: 40, damping: 12 } }
  : undefined
const defaultBase = { x: 80, y: 120, containerWidth: 640, containerHeight: 320, visible: false }
const base = query.has('explicitSpring')
  ? { ...defaultBase, springConfig: { stiffness: 100, damping: 20 } }
  : defaultBase
function Showcase() {
  const container = useRef(null)
  const secondaryContainer = useRef(null)
  const [secondary, setSecondary] = useState(false)
  const left = useMotionValue(120)
  const top = useMotionValue(60)
  const [props, configure] = useState(base)
  const [mounted, setMounted] = useState(true)
  const [wide, setWide] = useState(false)
  const [customOrigin, setCustomOrigin] = useState(false)
  return (
    <>
      <nav>
        <button onClick={() => configure({ ...base, visible: true })}>Show</button>
        <button onClick={() => setWide((value) => !value)}>Expand content</button>
        <button onClick={() => setCustomOrigin((value) => !value)}>Custom panel</button>
        <button onClick={() => configure({ ...base, visible: true, x: 580, y: 250 })}>
          Near right
        </button>
        <button onClick={() => configure({ ...base, visible: true, x: 60, y: 120 })}>
          Near left
        </button>
        <button onClick={() => configure(base)}>Hide</button>
        <button
          onClick={() => configure({ ...base, visible: true, x: 580, y: 250, animate: false })}
        >
          Static position
        </button>
        <button onClick={() => configure({ ...base, visible: true, entrance: false })}>
          No entrance
        </button>
        <button onClick={() => setMounted(false)}>Unmount</button>
        <button onClick={() => setMounted(true)}>Remount</button>
        {positionSource && (
          <button
            onClick={() => {
              left.set(left.get() === 120 ? 340 : 120)
              top.set(top.get() === 60 ? 180 : 60)
            }}
          >
            Move source
          </button>
        )}
      </nav>
      <div
        id="tooltip-box-container"
        ref={container}
        style={{ position: 'relative', width: 640, height: 320, border: '1px solid #ccc' }}
      />
      <nav>
        <button
          onClick={() => {
            configure({ ...base, visible: true })
            setSecondary(false)
          }}
        >
          First container
        </button>
        <button
          onClick={() => {
            configure({ ...base, visible: true })
            setSecondary(true)
          }}
        >
          Second container
        </button>
      </nav>
      <div
        id="tooltip-box-container-secondary"
        ref={secondaryContainer}
        style={{ position: 'relative', width: 640, height: 320, border: '1px solid #ccc' }}
      />
      {mounted && (
        <TooltipBox
          {...props}
          containerRef={secondary ? secondaryContainer : container}
          left={positionSource ? left : undefined}
          top={positionSource ? top : undefined}
          panelStyle={
            customOrigin
              ? { transformOrigin: '20% 80%', opacity: 0.6, transform: 'rotate(3deg)' }
              : undefined
          }
        >
          <TooltipContent
            title="Public tooltip"
            rows={[
              {
                label: wide ? 'Revenue from an expanded content-only observation' : 'Revenue',
                value: 120,
                color: 'orange',
              },
              { label: 'Cost', value: 72, color: 'green' },
            ]}
          />
        </TooltipBox>
      )}
    </>
  )
}
await document.fonts.load('500 14px Geist')
createRoot(document.getElementById('root')).render(
  <MotionConfig reducedMotion={reducedMotion}>
    <ChartConfigProvider value={config}>
      <Showcase />
    </ChartConfigProvider>
  </MotionConfig>,
)
