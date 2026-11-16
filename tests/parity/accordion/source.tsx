import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as Radix from '@source/registry/radix/accordion'
import * as Base from '@source/registry/base/accordion'
import { ShapeProvider } from '@source/registry/default/lib/shape-context'
import { SizeProvider } from '@source/registry/default/lib/size-context'
import { accordionCase } from './src/case'
import '@source/app/globals.css'
import './source-style.css'
const query = new URLSearchParams(window.location.search)
const config = accordionCase(query)
document.documentElement.className = query.get('theme') === 'dark' ? 'dark' : 'light'
const initialRows = [
  { value: config.firstValue ?? 'first', index: 0 },
  { value: 'second', index: 1 },
  { value: 'disabled', index: 2, disabled: true },
]
function Application() {
  const [compact, setCompact] = useState(config.size === 'compact')
  const [expanded, setExpanded] = useState(false)
  const [reversed, setReversed] = useState(false)
  const [hideSecond, setHideSecond] = useState(false)
  const initialValue =
    config.type === 'multiple' ? [config.firstValue ?? 'first'] : (config.firstValue ?? 'first')
  const [radixValue, setRadixValue] = useState<string | Array<string> | undefined>(
    config.controlled ? initialValue : undefined,
  )
  const [baseValue, setBaseValue] = useState<string | Array<string> | undefined>(
    config.controlled ? initialValue : undefined,
  )
  const [requests, setRequests] = useState<Array<{ id: string; values: Array<string> }>>([])
  const rows = (reversed ? [...initialRows].reverse() : initialRows).filter(
    (row) => !hideSecond || row.value !== 'second',
  )
  return (
    <ShapeProvider defaultShape={config.shape}>
      <SizeProvider size={compact ? 'compact' : 'default'}>
        <main
          data-requests={JSON.stringify(requests)}
          style={{
            padding: 24,
            display: 'grid',
            gap: 32,
            gridTemplateColumns: 'repeat(2, 288px)',
            transform: `scale(${config.scale})`,
            transformOrigin: 'top left',
          }}
        >
          <button type="button" onClick={() => setCompact((value) => !value)}>
            Toggle size
          </button>
          <button type="button" onClick={() => setExpanded((value) => !value)}>
            Resize content
          </button>
          <button type="button" onClick={() => setReversed((value) => !value)}>
            Reorder items
          </button>
          <button type="button" onClick={() => setHideSecond((value) => !value)}>
            Remove second
          </button>
          <button
            type="button"
            onClick={() => setRadixValue(config.type === 'multiple' ? ['second'] : 'second')}
          >
            Set Radix value
          </button>
          <button
            type="button"
            onClick={() => setBaseValue(config.type === 'multiple' ? ['second'] : 'second')}
          >
            Set Base value
          </button>
          {(
            [
              ['radix', Radix.Accordion, Radix],
              ['radix-group', Radix.AccordionGroup, Radix],
              ['base', Base.Accordion, Base],
              ['base-group', Base.AccordionGroup, Base],
            ] as const
          ).map(([id, Root, Parts]) => (
            <Root
              id={id}
              key={id}
              defaultValue={initialValue}
              type={config.type}
              collapsible={config.collapsible}
              highlight={id.endsWith('group') ? config.highlight : undefined}
              value={
                id === 'radix'
                  ? radixValue
                  : id === 'base'
                    ? baseValue
                    : config.controlled
                      ? initialValue
                      : undefined
              }
              onValueChange={
                config.callback
                  ? (value: string | Array<string>) =>
                      setRequests((previous) => [
                        ...previous,
                        { id, values: typeof value === 'string' ? (value ? [value] : []) : value },
                      ])
                  : undefined
              }
            >
              {rows.map((item) => (
                <Parts.AccordionItem {...item} key={item.value}>
                  <Parts.AccordionTrigger
                    id={config.customIds ? `custom-${id}-${item.value}` : undefined}
                  >
                    {'Question ' + item.value}
                  </Parts.AccordionTrigger>
                  <Parts.AccordionContent>
                    <p>A complete answer with enough content to measure.</p>
                    {expanded && (
                      <p>
                        Additional answer content changes the measured layout height without
                        toggling this item.
                      </p>
                    )}
                  </Parts.AccordionContent>
                </Parts.AccordionItem>
              ))}
            </Root>
          ))}
        </main>
      </SizeProvider>
    </ShapeProvider>
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Missing source mount')
createRoot(root).render(<Application />)
