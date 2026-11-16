import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChartStatFlow } from '@original-charts/chart-stat-flow'
import { nextStatFormat, statFlowConfiguration } from '../src/stat-flow-data'
import '@original-globals'
import './style.css'
import '../src/stat-flow.css'

function Example() {
  const [value, setValue] = useState(90000)
  const [format, setFormat] = useState('plain')
  const [mounted, setMounted] = useState(true)
  const [icon, setIcon] = useState(false)
  return (
    <div className="stat-flow-example">
      <nav>
        <button onClick={() => setValue((current) => (current === 90000 ? 94000 : 90000))}>
          Change value
        </button>
        <button onClick={() => setValue(0.125)}>Small value</button>
        <button onClick={() => setValue((current) => -current)}>Reverse sign</button>
        <button onClick={() => setFormat((current) => nextStatFormat(current))}>
          Change format
        </button>
        <button onClick={() => setIcon((current) => !current)}>Toggle icon</button>
        <button onClick={() => setMounted((current) => !current)}>Toggle mount</button>
      </nav>
      <p role="status">Format: {format}</p>
      <section className="stat-flow-display" aria-label="Revenue statistic">
        {mounted ? (
          <ChartStatFlow {...statFlowConfiguration(value, format)} icon={icon ? '◇' : undefined} />
        ) : null}
      </section>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Example />)
