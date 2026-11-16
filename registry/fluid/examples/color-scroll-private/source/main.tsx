import { ShapeProvider } from '/Users/oscar.hillestad/.codex/orchestrate/agent-stats-rewrite/upstream/fluid/lib/shape-context'
import { SizeProvider } from '/Users/oscar.hillestad/.codex/orchestrate/agent-stats-rewrite/upstream/fluid/lib/size-context'
import { colorScrollOptions } from '../options'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ColorPicker,
  ColorPickerPopover,
} from '/Users/oscar.hillestad/.codex/orchestrate/agent-stats-rewrite/upstream/fluid/registry/default/color-picker'
import { ScrollArea } from '/Users/oscar.hillestad/.codex/orchestrate/agent-stats-rewrite/upstream/fluid/registry/radix/scroll-area'
import { ScrollArea as ScrollAreaBase } from '/Users/oscar.hillestad/.codex/orchestrate/agent-stats-rewrite/upstream/fluid/registry/base/scroll-area'
import type { ColorFormat } from '/Users/oscar.hillestad/.codex/orchestrate/agent-stats-rewrite/upstream/fluid/registry/default/color-picker'
import './style.css'
const options = colorScrollOptions(location.search)
const formats: readonly ColorFormat[] = ['hex', 'rgb', 'hsl', 'oklch']
const swatches = [
  '#6B97FF',
  '#FFF',
  'rgb(255, 0, 0)',
  { color: 'tomato', label: 'Tomato' },
  { color: '#0000ff80', label: 'Blue' },
  '#000',
]
function App() {
  const [events, setEvents] = useState<string[]>([])
  const [shown, setShown] = useState(true)
  const content = (
    <div className="scroll-content" style={options.overflow ? undefined : { width: 100 }}>
      {Array.from({ length: options.overflow ? 12 : 1 }, (_, i) => (
        <p key={i}>Scroll item {i + 1}: native overflow content</p>
      ))}
    </div>
  )
  if (!shown)
    return (
      <div className="page">
        <button type="button" data-action="toggle" onClick={() => setShown(true)}>
          Remount
        </button>
      </div>
    )
  return (
    <div className="page">
      {options.lifecycle && (
        <button type="button" data-action="toggle" onClick={() => setShown(false)}>
          Unmount
        </button>
      )}
      <div className="panels">
        {formats.map((format) => (
          <ColorPicker
            key={format}
            id={format}
            defaultValue="#6B97FF"
            value={options.controlled ? '#6B97FF' : undefined}
            format={options.controlled ? format : undefined}
            defaultFormatOpen={format === 'hex' && options.initialOpen}
            defaultFormat={format}
            hideEyedropper
            swatches={swatches}
            onValueChange={
              format === 'hex'
                ? (value, parsed) =>
                    setEvents((prev) =>
                      [...prev, JSON.stringify({ type: 'value', value, parsed })].slice(-8),
                    )
                : undefined
            }
            onFormatChange={
              format === 'hex'
                ? (format) =>
                    setEvents((prev) =>
                      [...prev, JSON.stringify({ type: 'format', format })].slice(-8),
                    )
                : undefined
            }
          />
        ))}
      </div>
      <div className="toolbar">
        <ColorPickerPopover
          defaultOpen={options.initialOpen}
          defaultValue="#6B97FF"
          triggerLabel="Color"
          triggerShowRemove
          hideEyedropper
          swatches={swatches}
        />
      </div>
      <div className="scrolls">
        <ScrollArea
          id="scroll-radix"
          className="scroll-case"
          orientation={options.orientation}
          dir={options.direction}
          type={options.type}
        >
          {content}
        </ScrollArea>
        <ScrollAreaBase
          id="scroll-base"
          className="scroll-case"
          orientation={options.orientation}
          dir={options.direction}
        >
          {content}
        </ScrollAreaBase>
      </div>
      <output id="events">{JSON.stringify(events)}</output>
    </div>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Source fixture requires root')
createRoot(root).render(
  <ShapeProvider defaultShape={options.shape}>
    <SizeProvider defaultSize={options.size}>
      <App />
    </SizeProvider>
  </ShapeProvider>,
)
