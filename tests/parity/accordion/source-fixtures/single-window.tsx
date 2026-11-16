import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import sourceCss from '@source/app/globals.css?inline'
import environmentCss from '../source-style.css?inline'
import * as Radix from '@source/registry/radix/accordion'
import * as Base from '@source/registry/base/accordion'
import { ShapeProvider } from '@source/registry/default/lib/shape-context'
import { SizeProvider } from '@source/registry/default/lib/size-context'
import { accordionCase } from '../src/case'
import '@source/app/globals.css'
import '../source-style.css'

const query = new URLSearchParams(location.search)
const config = accordionCase(query)
const control = query.get('self') === '1'
document.documentElement.className = query.get('theme') === 'dark' ? 'dark' : 'light'
function isolatedColumn(source: boolean, id: string) {
  const host = document.createElement('div')
  const shadow = host.attachShadow({ mode: 'open' })
  const container = document.createElement('div')
  container.id = id
  if (source) {
    const style = document.createElement('style')
    style.textContent = sourceCss + environmentCss
    shadow.append(style)
  }
  shadow.append(container)
  return { host, container }
}
const left = isolatedColumn(control, 'native-runtime')
left.host.id = 'native-column'
const right = isolatedColumn(true, 'source-runtime')
const rows = [
  { value: 'first', index: 0 },
  { value: 'second', index: 1 },
  { value: 'disabled', index: 2, disabled: true },
]
function Replica({ column, values }: { column: string; values: Array<string> }) {
  return (
    <ShapeProvider defaultShape={config.shape}>
      <SizeProvider size={config.size ?? 'default'}>
        <main
          data-column={column}
          style={{ padding: 24, display: 'grid', gap: 32, gridTemplateColumns: 'repeat(2,288px)' }}
        >
          {(
            [
              ['radix', Radix.Accordion, Radix],
              ['radix-group', Radix.AccordionGroup, Radix],
              ['base', Base.Accordion, Base],
              ['base-group', Base.AccordionGroup, Base],
            ] as const
          ).map(([id, Root, Parts]) => (
            <Root
              id={`${column}-${id}`}
              key={id}
              type={config.type}
              value={config.type === 'multiple' ? values : (values[0] ?? '')}
              onValueChange={() => {}}
              collapsible={config.collapsible}
              highlight={id.endsWith('group') ? config.highlight : undefined}
            >
              {rows.map((item) => (
                <Parts.AccordionItem {...item} key={item.value}>
                  <Parts.AccordionTrigger>{`Question ${item.value}`}</Parts.AccordionTrigger>
                  <Parts.AccordionContent>
                    <p>A complete answer with enough content to measure.</p>
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
function Application() {
  const [values, setValues] = useState(['first'])
  useEffect(() => {
    if (control) return
    const url = new URL('/src/single-window-native.ts', location.href)
    import(/* @vite-ignore */ url.href).then((module) =>
      module.mountNative(left.container, {
        ...config,
        controlled: true,
        callback: true,
        omitToolbar: true,
      }),
    )
  }, [])
  const configure = (next: Array<string>) => {
    setValues(next)
    document
      .querySelector('#native-column')
      ?.shadowRoot?.querySelector('main')
      ?.dispatchEvent(new CustomEvent('accordion-control-value', { detail: next }))
  }
  const interrupt = () => {
    const target = right.container
      .querySelector(`#right-${query.get('root') ?? 'radix-group'}`)
      ?.querySelector('[role=region]:not([hidden])')
    const motion = target?.matches('.overflow-hidden')
      ? target
      : target?.querySelector('.overflow-hidden')
    const start = motion?.getBoundingClientRect().height ?? 0
    configure([])
    const follow = () => {
      const height = motion?.getBoundingClientRect().height ?? 0
      if (height > 0 && height < start) {
        configure(['second'])
        return
      }
      if (height === 0) {
        configure(['second'])
        return
      }
      requestAnimationFrame(follow)
    }
    requestAnimationFrame(follow)
  }
  const controls = (
    <nav style={{ height: 48, display: 'flex', gap: 16 }}>
      <button onClick={() => configure(['second'])}>Switch item</button>
      <button onClick={() => configure([])}>Close</button>
      <button onClick={() => configure(['second'])}>Open second</button>
      <button onClick={interrupt}>Interrupt close</button>
    </nav>
  )
  return (
    <>
      <section style={{ display: 'flex' }}>
        <div style={{ width: 720, flex: 'none' }}>
          {controls}
          <div
            ref={(node) => {
              if (node) node.append(left.host)
            }}
          />
        </div>
        <div style={{ width: 720, flex: 'none' }}>
          {controls}
          <div
            ref={(node) => {
              if (node) node.append(right.host)
            }}
          />
        </div>
      </section>
      {control && createPortal(<Replica column="left" values={values} />, left.container)}
      {createPortal(<Replica column="right" values={values} />, right.container)}
    </>
  )
}
const root = document.getElementById('root')
if (!root) throw Error('Missing comparison host')
createRoot(root).render(<Application />)
