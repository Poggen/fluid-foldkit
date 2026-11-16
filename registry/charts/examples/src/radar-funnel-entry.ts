import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { Layer, Match, Option, Schema } from 'effect'
import { constUndefined } from 'effect/Function'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  RadarChart,
  RadarArea,
  RadarGrid,
  RadarAxis,
  RadarLabels,
} from '@foldkit-visuals/charts/radar'
import { FunnelChart } from '@foldkit-visuals/charts/funnel'
import type { RadarChartProps } from '@foldkit-visuals/charts/radar'
import type { FunnelChartProps } from '@foldkit-visuals/charts/funnel'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const flags = new URLSearchParams(window.location.search)

const enterTransition: FunnelChartProps['enterTransition'] = Match.value(flags.get('enter')).pipe(
  Match.when('spring', (): FunnelChartProps['enterTransition'] => ({
    type: 'spring',
    stiffness: 100,
    damping: 8,
  })),
  Match.when('linear', (): FunnelChartProps['enterTransition'] => ({
    duration: 0.7,
    ease: 'linear',
  })),
  Match.when('function', (): FunnelChartProps['enterTransition'] => ({
    duration: 0.7,
    ease: (value: number) => value * value,
  })),
  Match.orElse(constUndefined),
)

const fluid = flags.has('fluid')

const zero = flags.has('zero')

const controlled = flags.has('controlled')

const radarSizing = (props: RadarChartProps, size: number): RadarChartProps => {
  if (zero) {
    return { ...props, size: 0 }
  }

  return fluid ? props : { ...props, size }
}

const metrics = [
  { key: 'a', label: 'Speed' },
  { key: 'b', label: 'Safety' },
  { key: 'c', label: 'Range' },
  { key: 'd', label: 'Comfort' },
  { key: 'e', label: 'Price' },
]

const radarData = [
  { label: 'North', values: { a: 80, b: 60, c: 70, d: 50, e: 90 } },
  { label: 'South', values: { a: 50, b: 80, c: 40, d: 90, e: 65 } },
]

const manyRadarMetrics = Array.from({ length: 25 }, (_, index) => ({
  key: `metric${index}`,
  label: `Metric ${index + 1}`,
}))

const manyRadarData = radarData.map((row, series) => ({
  label: row.label,
  values: Object.fromEntries(
    manyRadarMetrics.map((metric, index) => [metric.key, 35 + ((index * 13 + series * 17) % 55)]),
  ),
}))

const funnelData = [
  { label: 'Visitors', value: 10_000 },
  { label: 'Interested', value: 6500 },
  { label: 'Qualified', value: 3200 },
  { label: 'Customers', value: 1200 },
]

const manyFunnelStages = Array.from({ length: 25 }, (_, index) => ({
  label: `Stage ${index + 1}`,
  value: 10_000 - index * 300,
}))

const radar = RadarChart({ name: 'radar-complete' })

const funnel = FunnelChart({ name: 'funnel-complete' })

export const RadarKey = Symbol('ShowcaseRadar')

export const FunnelKey = Symbol('ShowcaseFunnel')

const RadarBlock = Block.make(radar.namespace, { ...radar.contract, key: RadarKey })

const FunnelBlock = Block.make(funnel.namespace, { ...funnel.contract, key: FunnelKey })

const chartLayers = Layer.mergeAll(
  RadarBlock.makeLayer(radar.plans<typeof RadarKey>(RadarBlock)),
  FunnelBlock.makeLayer(funnel.plans<typeof FunnelKey>(FunnelBlock)),
)

const radarBaseProps: RadarChartProps = {
  data: radarData,
  metrics,
  className: flags.has('short') ? 'h-[200px]' : '',
  animate: !flags.has('still'),
  children: [
    RadarGrid(),
    RadarAxis(),
    RadarLabels({ interactive: true }),
    RadarArea({ index: 0 }),
    RadarArea({ index: 1 }),
  ],
}

const radarProps = radarSizing(
  controlled ? { ...radarBaseProps, hoveredIndex: 1 } : radarBaseProps,
  320,
)

const funnelBaseProps: FunnelChartProps = {
  data: funnelData,
  orientation: flags.has('vertical') ? 'vertical' : 'horizontal',
  labelLayout: flags.has('grouped') ? 'grouped' : 'spread',
}

const funnelEntranceProps =
  enterTransition === undefined ? funnelBaseProps : { ...funnelBaseProps, enterTransition }

const funnelProps: FunnelChartProps = controlled
  ? { ...funnelEntranceProps, hoveredIndex: 1 }
  : funnelEntranceProps

const radarInputs = radar.inputs('radar', radarProps)

const funnelInputs = funnel.inputs('funnel', funnelProps)

const radarAlternateProps = radarSizing(
  {
    ...radarProps,
    levels: 3,
    margin: 40,
    staggerScale: 0.5,
    children: [
      RadarGrid({ stroke: 'purple', showLabels: false }),
      RadarAxis({ strokeOpacity: 0.3 }),
      RadarLabels({ offset: 18, fontSize: 12 }),
      RadarArea({
        index: 0,
        color: 'purple',
        showPoints: false,
        showStroke: false,
        showGlow: false,
      }),
      RadarArea({ index: 1 }),
    ],
  },
  280,
)

const radarAlternate = radar.inputs('radar', radarAlternateProps)

const radarMany = radar.inputs('radar', { ...radarProps, metrics: manyRadarMetrics, levels: 13 })

const radarManyAlternate = radar.inputs('radar', {
  ...radarAlternateProps,
  metrics: manyRadarMetrics,
  levels: 13,
})

const radarViewInputs = (alternate: boolean, many: boolean) => {
  if (many) {
    return alternate ? radarManyAlternate : radarMany
  }

  return alternate ? radarAlternate : radarInputs
}

const funnelAlternateProps: FunnelChartProps = {
  ...funnelProps,
  layers: 2,
  gap: 12,
  edges: 'straight',
  grid: true,
  labelLayout: 'grouped',
  labelOrientation: 'horizontal',
  labelAlign: 'end',
  showPercentage: false,
  color: 'purple',
  formatValue: (value) => `$${value}`,
}

const funnelAlternate = funnel.inputs('funnel', funnelAlternateProps)

const funnelDeep = funnel.inputs('funnel', { ...funnelProps, layers: 10 })

const funnelDeepAlternate = funnel.inputs('funnel', { ...funnelAlternateProps, layers: 10 })

const funnelViewInputs = (alternate: boolean, deepLayers: boolean) => {
  if (deepLayers) {
    return alternate ? funnelDeepAlternate : funnelDeep
  }

  return alternate ? funnelAlternate : funnelInputs
}

const Model = Schema.Struct({
  radar: RadarBlock.Model,
  funnel: FunnelBlock.Model,
  isAlternate: Schema.Boolean,
  hasManyStages: Schema.Boolean,
  hasManyRadarPoints: Schema.Boolean,
  hasDeepLayers: Schema.Boolean,
  isVisible: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedChange: {},
  ClickedToggleManyStages: {},
  ClickedToggleManyRadar: {},
  ClickedToggleDeepLayers: {},
  ClickedFocusLastStage: {},
  ClickedEmpty: {},
  ClickedRestore: {},
  ClickedUnmount: {},
  ClickedFocus: {},
  ClickedFocusFirst: {},
  ClickedClearFocus: {},
})

export const RadarFunnelFixtureKey = Symbol('RadarFunnelFixture')

const RadarFunnelFixtureBlock = Block.make('RadarFunnelFixture', {
  key: RadarFunnelFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const RadarBinding = RadarFunnelFixtureBlock.makeRequiredFieldBinding(RadarBlock, {
  field: 'radar',
  init: { contextToArgs: () => ['radar', radarData, radar.configuration(radarProps)] },
})

const FunnelBinding = RadarFunnelFixtureBlock.makeRequiredFieldBinding(FunnelBlock, {
  field: 'funnel',
  init: { contextToArgs: () => ['funnel', funnelData, funnel.configuration(funnelProps)] },
})

const RadarFunnelFixtureComposition = RadarFunnelFixtureBlock.makeComposition({
  bindings: [RadarBinding, FunnelBinding],
})

const layer = RadarFunnelFixtureBlock.makeLayer({
  init: RadarFunnelFixtureComposition.makeInit(() => ({
    model: {
      isAlternate: false,
      hasManyStages: false,
      hasManyRadarPoints: false,
      hasDeepLayers: false,
      isVisible: true,
    },
  })),
  update: RadarFunnelFixtureComposition.makeUpdate({
    ClickedToggleManyRadar: RadarFunnelFixtureBlock.makeStep((model) =>
      Update.combineSteps([
        RadarBinding.requestData({ data: model.hasManyRadarPoints ? radarData : manyRadarData }),
        RadarFunnelFixtureBlock.makeFieldsStep(() => ({ hasManyRadarPoints: Boolean.not })),
      ]),
    ),
    ClickedToggleDeepLayers: RadarFunnelFixtureBlock.makeFieldsStep(() => ({
      hasDeepLayers: Boolean.not,
    })),
    ClickedToggleManyStages: RadarFunnelFixtureBlock.makeStep((model) =>
      Update.combineSteps([
        FunnelBinding.requestData({ data: model.hasManyStages ? funnelData : manyFunnelStages }),
        RadarFunnelFixtureBlock.makeFieldsStep(() => ({ hasManyStages: Boolean.not })),
      ]),
    ),
    ClickedFocusLastStage: RadarFunnelFixtureBlock.makeStep((model) =>
      FunnelBinding.requestControl(
        funnel.configuration({ ...funnelProps, hoveredIndex: model.funnel.data.length - 1 }),
      ),
    ),
    ClickedChange: (m) => ({ model: { ...m, isAlternate: !m.isAlternate } }),
    ClickedUnmount: (m) => ({ model: { ...m, isVisible: !m.isVisible } }),
    ClickedEmpty: Update.combineSteps([
      RadarBinding.requestData({ data: [] }),
      FunnelBinding.requestData({ data: [] }),
    ]),
    ClickedRestore: Update.combineSteps([
      RadarBinding.requestData({ data: radarData }),
      RadarFunnelFixtureBlock.makeFieldsStep(() => ({ hasManyRadarPoints: () => false })),
      FunnelBinding.requestData({ data: funnelData }),
      RadarFunnelFixtureBlock.makeFieldsStep(() => ({ hasManyStages: () => false })),
    ]),
    ClickedFocusFirst: Update.combineSteps([
      RadarBinding.requestControl(radar.configuration({ ...radarProps, hoveredIndex: 0 })),
      FunnelBinding.requestControl(funnel.configuration({ ...funnelProps, hoveredIndex: 0 })),
    ]),
    ClickedClearFocus: Update.combineSteps([
      RadarBinding.requestControl(radar.configuration({ ...radarProps, hoveredIndex: null })),
      FunnelBinding.requestControl(funnel.configuration({ ...funnelProps, hoveredIndex: null })),
    ]),
    ClickedFocus: Update.combineSteps([
      RadarBinding.requestControl(radar.configuration({ ...radarProps, hoveredIndex: 1 })),
      FunnelBinding.requestControl(funnel.configuration({ ...funnelProps, hoveredIndex: 1 })),
    ]),
  }),
  view: RadarFunnelFixtureComposition.makeView((m, h) =>
    h.div(
      [h.Class('[line-height:1.5]')],
      [
        h.nav(
          [
            h.Class(
              '[&_button]:box-border [&_button]:[border:0] [&_button]:[border-radius:0] [&_button]:bg-transparent [&_button]:[font:inherit] [&_button]:[line-height:24px] [&_button]:[padding:6px_10px]',
            ),
          ],
          [
            Button.view(
              {
                onClick: Message.ClickedChange(),
                toView: (attributes) => h.button([...attributes.button], ['Change options']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedEmpty(),
                toView: (attributes) => h.button([...attributes.button], ['Empty']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedRestore(),
                toView: (attributes) => h.button([...attributes.button], ['Restore']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedUnmount(),
                toView: (attributes) => h.button([...attributes.button], ['Toggle mount']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedFocusFirst(),
                toView: (attributes) => h.button([...attributes.button], ['Focus first']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedFocus(),
                toView: (attributes) => h.button([...attributes.button], ['Focus second']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedClearFocus(),
                toView: (attributes) => h.button([...attributes.button], ['Clear focus']),
              },
              h,
            ),
          ],
        ),
        h.section(
          [
            h.Class(
              ['[max-width:320px] [min-height:320px]', fluid ? 'w-full' : 'w-[320px]'].join(' '),
            ),
            h.Id('radar-fixture'),
          ],
          m.isVisible
            ? [
                h.block(
                  RadarBinding.embedView({
                    slotId: 'radar',
                    model: m.radar,
                    viewInputs: radarViewInputs(m.isAlternate, m.hasManyRadarPoints),
                  }),
                ),
              ]
            : [],
        ),
        h.section(
          [
            h.Class(
              ['[max-width:320px] [min-height:320px]', fluid ? 'w-full' : 'w-[320px]'].join(' '),
            ),
            h.Id('funnel-fixture'),
          ],
          m.isVisible
            ? [
                h.block(
                  FunnelBinding.embedView({
                    slotId: 'funnel',
                    model: m.funnel,
                    viewInputs: funnelViewInputs(m.isAlternate, m.hasDeepLayers),
                  }),
                ),
              ]
            : [],
        ),
        h.nav(
          [
            h.Class(
              '[&_button]:box-border [&_button]:[border:0] [&_button]:[border-radius:0] [&_button]:bg-transparent [&_button]:[font:inherit] [&_button]:[line-height:24px] [&_button]:[padding:6px_10px]',
            ),
          ],
          [
            Button.view(
              {
                onClick: Message.ClickedToggleManyStages(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button, h.AriaPressed(String(m.hasManyStages))],
                    ['25 Funnel stages'],
                  ),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedFocusLastStage(),
                toView: (attributes) => h.button([...attributes.button], ['Focus last stage']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedToggleDeepLayers(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button, h.AriaPressed(String(m.hasDeepLayers))],
                    ['10 Funnel layers'],
                  ),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedToggleManyRadar(),
                toView: (attributes) =>
                  h.button(
                    [...attributes.button, h.AriaPressed(String(m.hasManyRadarPoints))],
                    ['25 Radar metrics / 13 levels'],
                  ),
              },
              h,
            ),
          ],
        ),
        h.output(
          [h.Id('state')],
          [
            `Radar ${Option.getOrNull(m.radar.focusedIndex) ?? 'none'} Funnel ${Option.getOrNull(m.funnel.focusedIndex) ?? 'none'} rows ${m.radar.data.length}`,
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(chartLayers))

await document.fonts.load('500 14px Geist')

Runtime.run(
  Program.makeElement({
    block: RadarFunnelFixtureBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
