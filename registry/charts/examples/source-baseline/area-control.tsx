import React from 'react'
import { createRoot } from 'react-dom/client'
import { AreaChart as SourceAreaChart } from '@charts-source/charts/area-chart'
import {
  Area as SourceArea,
  Grid as SourceGrid,
  XAxis as SourceXAxis,
  YAxis as SourceYAxis,
  ChartTooltip as SourceTooltip,
} from '@charts-source/charts/kit/cartesian/carriers'
import { Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { AreaChart, Area, Grid, XAxis, YAxis, ChartTooltip } from '../../src/index'
import sourceChartCss from '@charts-source/charts/styles.css?inline'
import nativeChartCss from '../../src/styles.css?inline'
import './style.css'

const data = [120, 180, 150, 240, 210, 290, 180].map((revenue, index) => ({
  date: new Date(Date.UTC(2025, 0, index + 1)),
  revenue,
  cost: revenue * 0.6,
}))
const Row = Schema.Struct({
  date: Schema.DateFromString,
  revenue: Schema.Finite,
  cost: Schema.Finite,
})
const area = AreaChart({ name: 'same-document-area', Row })
const props = {
  width: 640,
  height: 320,
  animationDuration: 1100,
  children: [
    Grid({ horizontal: true }),
    Area({ dataKey: 'revenue', fill: 'var(--chart-1)' }),
    XAxis(),
    YAxis(),
    ChartTooltip(),
  ],
}
const inputs = area.inputs('same-document-area', props)
const Definition = Block.makeDefinition('SameDocumentArea', {
  Model: Schema.Struct({ chart: area.block.Model }),
  Message: Schema.Never,
})
const Chart = Definition.makeBinding(area.block, {
  field: 'chart',
  init: { contextToArgs: () => ['same-document-area', data, area.configuration(props)] },
})
const Composition = Definition.makeComposition({ bindings: [Chart] })
const prepare = () =>
  Composition.prepareBlock({
    init: Composition.makeInit(() => ({ model: {} })),
    update: Composition.makeUpdate({}),
    view: Composition.makeView((model, h) =>
      h.block(
        Chart.embedView({
          slotId: 'area',
          model: model.chart,
          viewInputs: inputs,
        }),
      ),
    ),
  })
const Native: Block.FromAssemblyWithView<typeof Definition.Model, typeof prepare> =
  Block.assemble(prepare)
const mount = document.querySelector<HTMLElement>('#area-mount')!
const status = document.querySelector<HTMLElement>('#status')!
const buttons = [...document.querySelectorAll<HTMLButtonElement>('nav button')]
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
let dispose: (() => void) | undefined
let busy = false
const chartStyle = document.createElement('style')
chartStyle.id = 'active-chart-stylesheet'
document.head.append(chartStyle)
const chartStyles = {
  source: { css: sourceChartCss, file: 'pinned-bklit/showcase/migrated/charts/styles.css' },
  native: { css: nativeChartCss, file: 'registry/charts/src/styles.css' },
}

async function release() {
  dispose?.()
  dispose = undefined

  for (let frame = 0; frame < 120; frame += 1) {
    if (mount.isConnected && mount.childNodes.length === 0) {
      status.textContent = 'Released: host empty'
      return
    }
    await nextFrame()
  }
  throw new Error('Previous renderer did not release its host')
}

async function switchRenderer(renderer: 'source' | 'native' | 'release') {
  if (busy) return
  busy = true
  buttons.forEach((button) => {
    button.disabled = true
  })
  try {
    await release()
    chartStyle.textContent = ''
    delete chartStyle.dataset.source
    if (renderer !== 'release') {
      chartStyle.textContent = chartStyles[renderer].css
      chartStyle.dataset.source = chartStyles[renderer].file
    }
    if (renderer === 'source') {
      const root = createRoot(mount)
      root.render(
        <SourceAreaChart data={data} animationDuration={1100}>
          <SourceGrid horizontal />
          <SourceArea dataKey="revenue" fill="var(--chart-1)" />
          <SourceXAxis />
          <SourceYAxis />
          <SourceTooltip />
        </SourceAreaChart>,
      )
      dispose = () => root.unmount()
    } else if (renderer === 'native') {
      const handle = Runtime.embed(
        Program.makeElement({ block: Native, container: mount, commitScheduling: 'microtask' }),
      )
      dispose = handle.dispose
    }
    if (renderer !== 'release')
      status.textContent = `${renderer}: mounted · 640 × 320 · 1100 ms reveal`
    document.documentElement.dataset.renderer = renderer
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Renderer failed'
    throw error
  } finally {
    busy = false
    buttons.forEach((button) => {
      button.disabled = false
    })
  }
}
for (const renderer of ['source', 'native', 'release'] as const) {
  document.getElementById(renderer)!.addEventListener('click', () => {
    void switchRenderer(renderer)
  })
}
await document.fonts.load('500 14px Geist')
await switchRenderer('source')
