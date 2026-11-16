import { DateTime, Effect, Layer, Predicate, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { LineChart, AreaChart, Grid, Line, Area, XAxis, YAxis } from '../src/index'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  revenue: Schema.Finite,
  cost: Schema.Finite,
})

const data = [120, 180, 150, 240, 210, 290, 180].map((revenue, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2025, 0, index + 1))),
    revenue,
    cost: revenue * 0.6,
  }),
)

const line = LineChart({ name: 'ssr-line-family', Row })

const area = AreaChart({ name: 'ssr-area-family', Row })

const lineProps = {
  width: 640,
  height: 320,
  animationDuration: 1100,
  children: [
    Grid({ horizontal: true }),
    Line({ dataKey: 'revenue', showMarkers: true }),
    XAxis(),
    YAxis(),
  ],
}

const areaProps = {
  ...lineProps,
  children: [
    Grid({ horizontal: true }),
    Area({ dataKey: 'revenue', fill: 'var(--chart-1)' }),
    XAxis(),
    YAxis(),
  ],
}

export const LineChartKey = Symbol('LineChartKey')

const LineChartBlock = Block.make(line.namespace, { key: LineChartKey, ...line.contract })

export const AreaChartKey = Symbol('AreaChartKey')

const AreaChartBlock = Block.make(area.namespace, { key: AreaChartKey, ...area.contract })

const Model = Schema.Struct({ line: LineChartBlock.Model, area: AreaChartBlock.Model })

export const LineAreaServerProbeKey = Symbol('LineAreaServerProbe')

const Probe = Block.make('LineAreaServerProbe', {
  key: LineAreaServerProbeKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const LineBinding = Probe.makeRequiredFieldBinding(LineChartBlock, {
  field: 'line',
  init: { contextToArgs: () => ['source-line', data, line.configuration(lineProps)] },
})

const AreaBinding = Probe.makeRequiredFieldBinding(AreaChartBlock, {
  field: 'area',
  init: { contextToArgs: () => ['source-area', data, area.configuration(areaProps)] },
})

const LineAreaServerProbeComposition = Probe.makeComposition({
  bindings: [LineBinding, AreaBinding],
})

const layer = Probe.makeLayer({
  init: LineAreaServerProbeComposition.makeInit(() => ({ model: {} })),
  update: LineAreaServerProbeComposition.makeUpdate({}),
  view: LineAreaServerProbeComposition.makeView((model, h) => ({
    title: 'Line/Area server probe',
    body: h.div(
      [],
      [
        h.section(
          [h.Id('line-fixture')],
          [
            h.block(
              LineBinding.embedView({
                slotId: 'line',
                model: model.line,
                viewInputs: line.inputs('source-line', lineProps),
              }),
            ),
          ],
        ),
        h.section(
          [h.Id('area-fixture')],
          [
            h.block(
              AreaBinding.embedView({
                slotId: 'area',
                model: model.area,
                viewInputs: area.inputs('source-area', areaProps),
              }),
            ),
          ],
        ),
      ],
    ),
  })),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      LineChartBlock.makeLayer(line.plans(LineChartBlock)),
      AreaChartBlock.makeLayer(area.plans(AreaChartBlock)),
    ),
  ),
)

const rendered = await Effect.runPromise(
  renderToString({ block: Probe, layer }, {}, { isHydratable: false }),
)

await Effect.runPromise(
  Effect.sync(() =>
    process.stdout.write(
      `${JSON.stringify({
        globals: {
          document: Predicate.isUndefined(globalThis.document) ? 'undefined' : 'present',
          window: Predicate.isUndefined(globalThis.window) ? 'undefined' : 'present',
          HTMLElement: Predicate.isUndefined(globalThis.HTMLElement) ? 'undefined' : 'present',
          customElements: Predicate.isUndefined(globalThis.customElements)
            ? 'undefined'
            : 'present',
          requestAnimationFrame: Predicate.isUndefined(globalThis.requestAnimationFrame)
            ? 'undefined'
            : 'present',
        },
        html: rendered.html,
      })}\n`,
    ),
  ),
)
