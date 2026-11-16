import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Story } from 'foldkit'
import { inertHtml as h } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import {
  RadarChart,
  RadarArea,
  RadarGrid,
  RadarAxis,
  RadarLabels,
  FunnelChart,
  useRadar,
  useRadarStable,
  useRadarHover,
  RadarProvider,
  radarCssVars,
  defaultRadarColors,
} from '@/ui/charts/index.js'

const radar = RadarChart({ name: 'public-radar' })
const funnel = FunnelChart({ name: 'public-funnel' })
const RadarKey = Symbol('PublicRadar')
const Radar = Block.make(radar.namespace, { key: RadarKey, ...radar.contract })
const FunnelKey = Symbol('PublicFunnel')
const Funnel = Block.make(funnel.namespace, { key: FunnelKey, ...funnel.contract })
const radarLayer = Radar.makeLayer(radar.plans(Radar))
const funnelLayer = Funnel.makeLayer(funnel.plans(Funnel))
const data = [{ label: 'A', values: { x: 40, y: 80, z: 60 } }]
const funnelData = [{ label: 'A', value: 1 }]
const props = {
  data,
  metrics: [
    { key: 'x', label: 'X' },
    { key: 'y', label: 'Y' },
    { key: 'z', label: 'Z' },
  ],
  children: [RadarGrid(), RadarAxis(), RadarLabels(), RadarArea({ index: 0 })],
}
const Model = Schema.Struct({ radar: Radar.Model, funnel: Funnel.Model })
const Message = defineMessageUnion({ Changed: {} })
const ParentKey = Symbol('PublicRadarFunnel')
const Parent = Block.make('PublicRadarFunnel', {
  key: ParentKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const R = Parent.makeRequiredFieldBinding(Radar, {
  field: 'radar',
  init: { contextToArgs: () => ['radar', data] },
})
const F = Parent.makeRequiredFieldBinding(Funnel, {
  field: 'funnel',
  init: { contextToArgs: () => ['funnel', funnelData] },
})
const Composition = Parent.makeComposition({ bindings: [R, F] })
const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({ Changed: R.requestData({ data }) }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.block(
          R.embedView({
            slotId: 'radar',
            model: model.radar,
            viewInputs: radar.inputs('radar', props),
          }),
        ),
        h.block(
          F.embedView({
            slotId: 'funnel',
            model: model.funnel,
            viewInputs: funnel.inputs('funnel', { data: funnelData }),
          }),
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(Layer.mergeAll(radarLayer, funnelLayer)))
export const program = Program.makeElement({ block: Parent, layer, container: null })
const inspectContext = Story.story({ block: Radar, layer: radarLayer }, Story.init('x', data)).pipe(
  Effect.map((model) => {
    const context = radar.context(model, props, () => {})
    const sourceOptional: unknown = context.enterTransition
    RadarProvider(context, (value) => {
      useRadar(value)
      return h.empty
    })
    useRadarHover(context)
    useRadarStable(context)
    return sourceOptional
  }),
)
void inspectContext
void radarCssVars
void defaultRadarColors
