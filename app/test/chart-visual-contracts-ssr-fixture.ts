import {
  AreaChart,
  PatternArea,
  ChartLoadingLabel,
  ChartRevealClip,
  ChartStatFlowBlock,
  ChartStatFlowLayer,
} from '@foldkit-visuals/charts'
import {
  BarLoadingSkeletonBlock,
  BarLoadingSkeletonLayer,
} from '@foldkit-visuals/charts/bar-skeleton'
import { DateTime, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { HeatmapLegend } from '@foldkit-visuals/charts/heatmap'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })
const patternArea = AreaChart({ name: 'visual-pattern-area', Row })
const PatternAreaKey = Symbol('VisualPatternArea')
const PatternAreaBlock = Block.make(patternArea.namespace, {
  key: PatternAreaKey,
  ...patternArea.contract,
})
const patternProps = {
  width: 400,
  height: 240,
  animationDuration: 0,
  children: [PatternArea({ dataKey: 'value', patternPreset: 'diagonal', fill: '#31597d' })],
}

const Flags = Schema.Struct({
  replacement: Schema.Boolean,
  reduced: Schema.Boolean,
  exiting: Schema.Boolean,
})
type Flags = typeof Flags.Type
const Model = Schema.Struct({
  flags: Flags,
  pattern: PatternAreaBlock.Model,
  stat: ChartStatFlowBlock.Model,
  skeleton: BarLoadingSkeletonBlock.Model,
})
type Model = typeof Model.Type
const effects = Block.makeEffectsContract<
  never,
  | Block.FactsOf<typeof PatternAreaBlock>['programRequirements']
  | Block.FactsOf<typeof ChartStatFlowBlock>['programRequirements']
  | Block.FactsOf<typeof BarLoadingSkeletonBlock>['programRequirements']
>()
const FixtureKey = Symbol('ChartVisualSsrFixture')
const Fixture = Block.make('ChartVisualSsrFixture', {
  key: FixtureKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([Flags]),
  ChildInitContext: Flags,
  effects,
  view: { kind: 'Document' },
})
const Stat = Fixture.makeRequiredFieldBinding(ChartStatFlowBlock, {
  field: 'stat',
  init: {
    contextToArgs: (flags: Flags) => [
      {
        value: 12.345,
        label: '<Total>',
        prefix: '<',
        suffix: '>',
        formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        ...(flags.replacement ? { valueClassName: '', labelClassName: '' } : {}),
      },
    ],
  },
})
const Skeleton = Fixture.makeRequiredFieldBinding(BarLoadingSkeletonBlock, {
  field: 'skeleton',
  init: {
    contextToArgs: (flags: Flags) => [
      'visual-bars',
      { innerWidth: 400, innerHeight: 140 },
      flags.reduced,
    ],
  },
})
const Pattern = Fixture.makeRequiredFieldBinding(PatternAreaBlock, {
  field: 'pattern',
  init: {
    contextToArgs: () => [
      'visual-pattern-area',
      [
        { date: DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-01T00:00:00Z')), value: 20 },
        { date: DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-02T00:00:00Z')), value: 60 },
        { date: DateTime.toDateUtc(DateTime.makeUnsafe('2026-11-03T00:00:00Z')), value: 40 },
      ],
      patternArea.configuration(patternProps),
    ],
  },
})
const Composition = Fixture.makeComposition({ bindings: [Stat, Skeleton, Pattern] })
const layer = Fixture.makeLayer({
  init: Composition.makeInit((flags: Flags) => ({ model: { flags }, childInitContext: flags })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Chart visual CSS consumers',
    body: h.main(
      [h.Style({ fontSize: '16px', fontWeight: '400' })],
      [
        h.section(
          [h.Id('visual-pattern')],
          [
            h.block(
              Pattern.embedView({
                slotId: 'pattern',
                model: model.pattern,
                viewInputs: patternArea.inputs('visual-pattern-area', patternProps),
              }),
            ),
          ],
        ),
        h.section(
          [h.Id('visual-stat')],
          [
            h.block(
              Stat.embedView({
                slotId: 'stat',
                model: model.stat,
                viewInputs: { icon: [h.span([h.DataAttribute('test-icon', '')], ['Icon'])] },
              }),
            ),
          ],
        ),
        h.section(
          [h.Id('visual-heatmap-legends'), h.Style({ '--chart-label': '#31597d' })],
          [
            HeatmapLegend({ labelClassName: 'font-semibold' }, h, 'legend-default'),
            HeatmapLegend(
              { fontSize: 22, labelClassName: 'font-medium' },
              h,
              'legend-explicit-size',
            ),
          ],
        ),
        h.section(
          [h.Style({ position: 'relative', width: '400px', height: '80px' })],
          [ChartLoadingLabel(h, { text: 'ABCD', exiting: model.flags.exiting })],
        ),
        h.svg(
          [h.Id('visual-clips'), h.Width('400'), h.Height('100')],
          [
            ChartRevealClip(h, {
              clipPathId: 'visual-tween',
              height: 50,
              targetWidth: 80,
              padding: 2,
              revealEpoch: 1,
              enterTransition: { type: 'tween', ease: [0.1, 0.2, 0.3, 0.4] },
            }),
            ChartRevealClip(h, {
              clipPathId: 'visual-negative',
              height: 50,
              targetWidth: -10,
              padding: 2,
              revealEpoch: 1,
              enterTransition: { type: 'tween' },
            }),
            ChartRevealClip(h, {
              clipPathId: 'visual-spring',
              height: 50,
              targetWidth: 20,
              revealEpoch: 1,
              mode: 'conceal',
              enterTransition: { type: 'spring', duration: 0.7, ease: 'linear' },
            }),
          ],
        ),
        h.svg(
          [h.Id('visual-skeleton'), h.Width('400'), h.Height('140')],
          [h.block(Skeleton.embedView({ slotId: 'skeleton', model: model.skeleton }))],
        ),
      ],
    ),
  })),
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      ChartStatFlowLayer,
      BarLoadingSkeletonLayer,
      PatternAreaBlock.makeLayer(patternArea.plans(PatternAreaBlock)),
    ),
  ),
)

export const renderChartVisualContracts = (flags: Flags) =>
  renderToString({ block: Fixture, layer }, { Flags }, { flags, isHydratable: false })
