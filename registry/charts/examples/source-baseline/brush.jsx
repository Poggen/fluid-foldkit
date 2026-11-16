import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Area,
  AreaChart,
  ChartBrush,
  ChartBrushLayout,
  Line,
  LineChart,
} from '@original-charts/index'
import '@original-globals'
import './style.css'

const initialData = [20, 55, 35, 70, 40, 90].map((value, index) => ({
  date: new Date(index * 200),
  value,
  label: `Point ${index}`,
}))
const pattern = { preset: 'diagonal', color: 'var(--chart-1)' }
const slotSelection = { start: new Date(200), end: new Date(600) }
const margin = { top: 8, bottom: 8, left: 20, right: 20 }
function BrushFixture() {
  const [data, setData] = useState(initialData)
  const [enabled, setEnabled] = useState(true)
  const [visible, setVisible] = useState(true)
  return (
    <div id="brush-fixture" style={{ width: 640, lineHeight: 'normal' }}>
      <button onClick={() => setVisible((value) => !value)}>
        {visible ? 'Hide chart group' : 'Show chart group'}
      </button>
      {visible && (
        <ChartBrushLayout
          data={data}
          enabled={enabled}
          height={100}
          brushStrip={(layout) => (
            <div id="brush-strip" style={{ width: 640, height: 100 }}>
              <AreaChart
                data={data}
                animationDuration={0}
                margin={margin}
                style={{ width: 640, height: 100 }}
              >
                <Area dataKey="value" fadeEdges={false} />
                <ChartBrush
                  initialSelection={layout.brushSelection}
                  selection={layout.brushSelection}
                  onSelectionChange={layout.onBrushSelectionChange}
                  selectionPattern={pattern}
                />
              </AreaChart>
            </div>
          )}
        >
          {(layout) => (
            <>
              <nav>
                <button onClick={() => setEnabled((value) => !value)}>Toggle brush</button>
                <button onClick={() => setData((rows) => [...rows])}>Replace equal data</button>
                <button onClick={() => layout.onBrushSelectionChange(null)}>Full extent</button>
                <button onClick={() => layout.onBrushSelectionChange(null)}>Slot reset</button>
                <button onClick={() => layout.onBrushSelectionChange(slotSelection)}>
                  Slot select
                </button>
              </nav>
              <div style={{ width: 640, height: 320 }}>
                <LineChart
                  data={data}
                  animationDuration={0}
                  xDomain={layout.xDomain}
                  xDomainSlotCount={layout.xDomainSlotCount}
                  style={{ width: 640, height: 320 }}
                >
                  <Line dataKey="value" fadeEdges={false} />
                </LineChart>
              </div>
              <output id="brush-status">
                {layout.xDomain
                  ? `${layout.xDomain[0].getTime()}..${layout.xDomain[1].getTime()}`
                  : 'Unrestricted'}
              </output>
            </>
          )}
        </ChartBrushLayout>
      )}
    </div>
  )
}
const style = document.createElement('style')
style.textContent =
  '#brush-fixture button{border:2px outset black;background:ButtonFace;color:ButtonText}'
document.head.append(style)
await document.fonts.load('500 14px Geist')
createRoot(document.getElementById('root')).render(<BrushFixture />)
