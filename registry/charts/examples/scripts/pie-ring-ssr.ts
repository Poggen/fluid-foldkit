import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { PieChart, PieCenter, PieCenterShell, PieData } from '@foldkit-visuals/charts/pie'
import { RingChart, RingCenter, RingData } from '@foldkit-visuals/charts/ring'

const data = [
  { label: 'A', value: 3 },
  { label: 'B', value: 1 },
]

const ringData = data.map((d) => ({ ...d, maxValue: 5 }))

const pie = PieChart({ name: 'ssr-pie-complete', Row: PieData })

const ring = RingChart({ name: 'ssr-ring-complete', Row: RingData })

const shell = PieCenterShell({ name: 'ssr-shell-complete' })

export const PieKey = Symbol('SsrPie')

export const RingKey = Symbol('SsrRing')

export const ShellKey = Symbol('SsrShell')

const Pie = Block.make(pie.namespace, { ...pie.contract, key: PieKey })

const Ring = Block.make(ring.namespace, { ...ring.contract, key: RingKey })

const Shell = Block.make(shell.namespace, { ...shell.contract, key: ShellKey })

const chartLayers = Layer.mergeAll(
  Pie.makeLayer(pie.plans<typeof PieKey>(Pie)),
  Ring.makeLayer(ring.plans<typeof RingKey>(Ring)),
  Shell.makeLayer(shell.plans<typeof ShellKey>(Shell)),
)

const style = {
  width: 320,
  lineHeight: 1.25,
  fontWeight: 500,
  floodOpacity: 0.25,
  stopOpacity: 0.5,
  WebkitFlexGrow: 2,
  msFlex: 2,
  '--CustomColor': 'red',
  '--CustomNumeric': 2,
}

const pp = {
  style,
  data,
  size: 320,
  innerRadius: 70,
  children: [PieCenter()],
}

const rp = { data: ringData, size: 320, children: [RingCenter()] }

const Model = Schema.Struct({
  pie: Pie.Model,
  ring: Ring.Model,
  shell: Shell.Model,
})

export const PolarServerProbeKey = Symbol('PolarServerProbe')

const PolarServerProbeDefinition = Block.make('PolarServerProbe', {
  key: PolarServerProbeKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  Model,
  Message: Schema.Never,
})

const P = PolarServerProbeDefinition.makeRequiredFieldBinding(Pie, {
  field: 'pie',
  init: { contextToArgs: () => ['pie', data] },
})

const R = PolarServerProbeDefinition.makeRequiredFieldBinding(Ring, {
  field: 'ring',
  init: { contextToArgs: () => ['ring', ringData] },
})

const S = PolarServerProbeDefinition.makeRequiredFieldBinding(Shell, {
  field: 'shell',
  init: { contextToArgs: () => ['shell', [{ label: 'shell', value: 4 }]] },
})

const PolarServerProbeComposition = PolarServerProbeDefinition.makeComposition({
  bindings: [P, R, S],
})

const layer = PolarServerProbeDefinition.makeLayer({
  init: PolarServerProbeComposition.makeInit(() => ({ model: {} })),
  update: PolarServerProbeComposition.makeUpdate({}),
  view: PolarServerProbeComposition.makeView((m, h) => ({
    title: 'Polar SSR',
    body: h.div(
      [],
      [
        h.section(
          [h.Id('pie-fixture')],
          [
            h.block(
              P.embedView({ slotId: 'pie', model: m.pie, viewInputs: pie.inputs('pie', pp) }),
            ),
          ],
        ),
        h.section(
          [h.Id('ring-fixture')],
          [
            h.block(
              R.embedView({ slotId: 'ring', model: m.ring, viewInputs: ring.inputs('ring', rp) }),
            ),
          ],
        ),
        h.section(
          [h.Id('shell-fixture')],
          [
            h.block(
              S.embedView({
                slotId: 'shell',
                model: m.shell,
                viewInputs: shell.inputs('shell', {
                  centerValue: 4,
                  contextSize: 320,
                  innerRadiusPx: 70,
                }),
              }),
            ),
          ],
        ),
      ],
    ),
  })),
})

const rendered = await Effect.runPromise(
  renderToString(
    { block: PolarServerProbeDefinition, layer: layer.pipe(Layer.provide(chartLayers)) },
    {},
    { isHydratable: false },
  ),
)

await Effect.runPromise(
  Effect.sync(() =>
    process.stdout.write(
      JSON.stringify({
        globals: {
          document: typeof document,
          window: typeof window,
          HTMLElement: typeof HTMLElement,
          customElements: typeof customElements,
          requestAnimationFrame: typeof requestAnimationFrame,
        },
        // oxlint-enable anti-slop/no-runtime-typeof
        html: rendered.html,
      }),
    ),
  ),
)
