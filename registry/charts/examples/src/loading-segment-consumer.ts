import { loadingSegmentToolbar } from './loading-segment-toolbar'
import { Number as EffectNumber } from 'effect'
import { Boolean } from 'effect'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Dom, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { curveMonotoneX } from 'd3-shape'
import {
  BarChartLoading,
  ChartLoadingLabel,
  ChartRevealClip,
  getSkeletonHeights,
  LineChart,
  LineLoadingPulseStrokeBlock,
  LineLoadingPulseStrokeLayer,
  LineLoadingSweepLayer,
  lineLoadingSweepInputs,
  LineLoadingSweepBlock,
} from '@foldkit-visuals/charts/line'
import type {
  BarChartLoadingProps,
  ChartLoadingLabelProps,
  ChartRevealClipProps,
} from '@foldkit-visuals/charts/line'

import {
  Row,
  rows,
  standaloneSweep,
  contextSweep,
  lineProps,
  pulseConfiguration,
  LoadingSegmentFlags,
} from './loading-segment-options'

export { LoadingSegmentFlags, loadingSegmentFlags } from './loading-segment-options'

const loadingProps: BarChartLoadingProps = {
  aspectRatio: '2 / 1',
  margin: { left: 32, right: 24 },
  className: 'public-loading-placeholder',
}

const placeholder = BarChartLoading('public-loading-placeholder', loadingProps)

const line = LineChart({ name: 'public-loading-segment-line', Row })

const loadingLineInputs = line.inputs('public-loading-line', lineProps)

const sweep = LineLoadingSweepBlock

export const PlaceholderKey = Symbol('PublicLoadingPlaceholder')

export const PublicLoadingLineKey = Symbol('PublicLoadingLine')

const Placeholder = Block.make(placeholder.namespace, {
  key: PlaceholderKey,
  ...placeholder.contract,
})

const PublicLine = Block.make(line.namespace, { key: PublicLoadingLineKey, ...line.contract })

const childLayers = Layer.mergeAll(
  Placeholder.makeLayer(placeholder.plans(Placeholder)),
  PublicLine.makeLayer(line.plans(PublicLine)),
  LineLoadingPulseStrokeLayer,
  LineLoadingSweepLayer,
)

const Model = Schema.Struct({
  placeholder: Placeholder.Model,
  line: PublicLine.Model,
  firstPulse: LineLoadingPulseStrokeBlock.Model,
  secondPulse: LineLoadingPulseStrokeBlock.Model,
  standaloneSweep: sweep.Model,
  contextSweep: sweep.Model,
  sweepCompletions: Schema.Natural,
  epoch: Schema.Natural,
  pulseCycles: Schema.Natural,
  isPulseVisible: Schema.Boolean,
  isLineVisible: Schema.Boolean,
  mode: Schema.Literals(['reveal', 'conceal']),
})

const Message = defineMessageUnion({
  ClickedReplay: {},
  ClickedPulseEnter: {},
  ClickedPulseExit: {},
  ClickedPulseVisibility: {},
  ClickedLineVisibility: {},
  ClickedConcealed: {},
  ClipConcealed: {},
  ClickedPlaceholderReady: {},
  ClickedPlaceholderLoading: {},
  ClickedFocusLast: {},
  ClickedClearFocus: {},
  CompletedFocusReplay: {},
  ClickedSweepLoop: {},
  ClickedSweepEnter: {},
  ClickedSweepExit: {},
})

export const LoadingSegmentConsumerKey = Symbol('PublicLoadingSegmentConsumer')

export const PublicLoadingSegmentConsumerBlock = Block.make('PublicLoadingSegmentConsumer', {
  key: LoadingSegmentConsumerKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([LoadingSegmentFlags]),
  view: { kind: 'Element' },
})

const PlaceholderBinding = PublicLoadingSegmentConsumerBlock.makeRequiredFieldBinding(Placeholder, {
  field: 'placeholder',
  init: {
    contextToArgs: () => ['public-loading-bar', placeholder.data, placeholder.configuration],
  },
})

const LineBinding = PublicLoadingSegmentConsumerBlock.makeRequiredFieldBinding(PublicLine, {
  field: 'line',
  init: {
    contextToArgs: () => ['public-loading-line', rows, line.configuration(lineProps)],
  },
})

const pulseCompleted = () =>
  PublicLoadingSegmentConsumerBlock.makeFieldsStep(() => ({
    pulseCycles: EffectNumber.increment,
  }))

const FirstPulseBinding = PublicLoadingSegmentConsumerBlock.makeRequiredFieldBinding(
  LineLoadingPulseStrokeBlock,
  {
    field: 'firstPulse',
    init: { contextToArgs: () => ['public-first-pulse', pulseConfiguration] },
  },
).withOutMessagePolicy({
  fold: PublicLoadingSegmentConsumerBlock.makeOutMessageFold(LineLoadingPulseStrokeBlock, {
    CycleCompleted: pulseCompleted,
  }),
})

const SecondPulseBinding = PublicLoadingSegmentConsumerBlock.makeRequiredFieldBinding(
  LineLoadingPulseStrokeBlock,
  {
    field: 'secondPulse',
    init: {
      contextToArgs: () => [
        'public-second-pulse',
        { ...pulseConfiguration, stroke: 'var(--chart-2)' },
      ],
    },
  },
).withOutMessagePolicy({
  fold: PublicLoadingSegmentConsumerBlock.makeOutMessageFold(LineLoadingPulseStrokeBlock, {
    CycleCompleted: pulseCompleted,
  }),
})

const sweepCompletion = () =>
  Update.combineSteps([
    PlaceholderBinding.requestConfigure({
      configuration: { ...placeholder.configuration, status: 'ready' },
    }),
    PublicLoadingSegmentConsumerBlock.makeFieldsStep(() => ({
      sweepCompletions: EffectNumber.increment,
    })),
  ])

const StandaloneSweepBinding = PublicLoadingSegmentConsumerBlock.makeRequiredFieldBinding(sweep, {
  field: 'standaloneSweep',
  init: {
    contextToArgs: (flags: typeof LoadingSegmentFlags.Type) => [
      'public-standalone-sweep',
      standaloneSweep,
      flags.reducedMotion,
    ],
  },
}).withOutMessagePolicy({
  fold: PublicLoadingSegmentConsumerBlock.makeOutMessageFold(sweep, {
    TransitionCompleted: sweepCompletion,
  }),
})

const ContextSweepBinding = PublicLoadingSegmentConsumerBlock.makeRequiredFieldBinding(sweep, {
  field: 'contextSweep',
  init: {
    contextToArgs: (flags: typeof LoadingSegmentFlags.Type) => [
      'public-context-sweep',
      contextSweep,
      flags.reducedMotion,
    ],
  },
}).withOutMessagePolicy({
  fold: PublicLoadingSegmentConsumerBlock.makeOutMessageFold(sweep, {
    TransitionCompleted: sweepCompletion,
  }),
})

export const FocusReplay = PublicLoadingSegmentConsumerBlock.makeCommand('FocusReplay', {
  messages: [Message.CompletedFocusReplay],
  *handler() {
    return () =>
      Dom.focus('#public-loading-replay', { preventScroll: true }).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusReplay()),
      )
  },
})

const PublicLoadingSegmentConsumerComposition = PublicLoadingSegmentConsumerBlock.makeComposition({
  bindings: [
    PlaceholderBinding,
    LineBinding,
    FirstPulseBinding,
    SecondPulseBinding,
    StandaloneSweepBinding,
    ContextSweepBinding,
  ],
})
export type LoadingSegmentViewBuilder = Block.ViewBuilderFor<
  typeof PublicLoadingSegmentConsumerComposition
>

const placeholderInputs = placeholder.inputs('public-loading-bar')

export const PublicLoadingSegmentConsumerLayer = PublicLoadingSegmentConsumerBlock.makeLayer({
  init: PublicLoadingSegmentConsumerComposition.makeInit(
    (flags: typeof LoadingSegmentFlags.Type) => ({
      childInitContext: flags,
      model: {
        epoch: 0,
        pulseCycles: 0,
        isPulseVisible: true,
        isLineVisible: true,
        mode: 'reveal',
        sweepCompletions: 0,
      },
    }),
  ),
  update: PublicLoadingSegmentConsumerComposition.makeUpdate({
    ClickedReplay: (model) =>
      Update.combineSteps([
        PublicLoadingSegmentConsumerBlock.makeFieldsStep(() => ({
          epoch: EffectNumber.increment,
          mode: () => 'reveal',
        })),
        FirstPulseBinding.requestConfigure({
          configuration: {
            ...model.firstPulse.configuration,
            mode: 'loop',
            loopEpoch: model.epoch + 1,
          },
        }),
      ])(model),
    ClickedPulseEnter: (model) =>
      FirstPulseBinding.requestConfigure({
        configuration: { ...model.firstPulse.configuration, mode: 'enter' },
      })(model),
    ClickedPulseExit: (model) =>
      FirstPulseBinding.requestConfigure({
        configuration: { ...model.firstPulse.configuration, mode: 'exit' },
      })(model),
    ClickedPulseVisibility: PublicLoadingSegmentConsumerBlock.makeFieldsStep(() => ({
      isPulseVisible: Boolean.not,
    })),
    ClickedLineVisibility: PublicLoadingSegmentConsumerBlock.makeFieldsStep(() => ({
      isLineVisible: Boolean.not,
    })),
    ClickedConcealed: PublicLoadingSegmentConsumerBlock.makeFieldsStep(() => ({
      mode: () => 'conceal',
    })),
    ClipConcealed: Update.combineSteps([
      PlaceholderBinding.requestConfigure({
        configuration: { ...placeholder.configuration, status: 'ready' },
      }),
      PublicLoadingSegmentConsumerBlock.makeCommandsStep(() => [FocusReplay()]),
    ]),
    ClickedPlaceholderReady: PlaceholderBinding.requestConfigure({
      configuration: { ...placeholder.configuration, status: 'ready' },
    }),
    ClickedPlaceholderLoading: PlaceholderBinding.requestConfigure({
      configuration: placeholder.configuration,
    }),
    ClickedFocusLast: LineBinding.requestFocus({ index: rows.length - 1 }),
    ClickedClearFocus: LineBinding.requestFocus({ index: null }),
    CompletedFocusReplay: PublicLoadingSegmentConsumerBlock.makeNoopStep(),
    ClickedSweepLoop: StandaloneSweepBinding.requestConfigure({
      configuration: { ...standaloneSweep, mode: 'loop' },
    }),
    ClickedSweepEnter: StandaloneSweepBinding.requestConfigure({
      configuration: { ...standaloneSweep, mode: 'enter' },
    }),
    ClickedSweepExit: StandaloneSweepBinding.requestConfigure({
      configuration: { ...standaloneSweep, mode: 'exit' },
    }),
  }),
  view: PublicLoadingSegmentConsumerComposition.makeView((model, h) => {
    const lineInputs = loadingLineInputs.withRenderContext((context, chartH) =>
      chartH.svg(
        [
          chartH.Class('absolute [left:var(--loading-sweep-left)] [top:var(--loading-sweep-top)]'),
          chartH.Width(String(context.stable.innerWidth)),
          chartH.Height(String(context.stable.innerHeight)),
          chartH.Style({
            '--loading-sweep-left': `${context.stable.margin.left}px`,
            '--loading-sweep-top': `${context.stable.margin.top}px`,
          }),
        ],
        [
          h.block(
            ContextSweepBinding.embedView({
              slotId: 'public-context-sweep',
              model: model.contextSweep,
              viewInputs: lineLoadingSweepInputs(
                { curve: curveMonotoneX },
                {
                  innerWidth: context.stable.innerWidth,
                  innerHeight: context.stable.innerHeight,
                },
              ),
            }),
          ),
        ],
      ),
    )

    const label: ChartLoadingLabelProps = {
      text: 'Loading preview',
      exiting: model.mode === 'conceal',
    }

    const clip: ChartRevealClipProps<ReturnType<typeof Message.ClipConcealed>> = {
      clipPathId: 'public-loading-clip',
      height: 140,
      targetWidth: 400,
      revealEpoch: model.epoch,
      mode: model.mode,
      onComplete: Message.ClipConcealed(),
    }

    const standalonePulse =
      typeof location !== 'undefined' && new URLSearchParams(location.search).has('publicPulse')

    return h.section(
      [h.Id('public-loading-segment-consumer')],
      [
        h.h2([], ['Public loading and selection parts']),
        loadingSegmentToolbar(
          Message,
          standalonePulse,
          model.isPulseVisible,
          model.isLineVisible,
          typeof location !== 'undefined' && new URLSearchParams(location.search).has('lifecycle'),
          h,
        ),
        h.div(
          [h.Class('relative [width:400px] [height:140px]')],
          [
            h.svg(
              [h.ViewBox('0 0 400 140'), h.Width('400'), h.Height('140')],
              [
                h.defs([], [ChartRevealClip(h, clip)]),
                h.g(standalonePulse ? [] : [h.ClipPath('url(#public-loading-clip)')], [
                  model.isPulseVisible
                    ? h.block(
                        FirstPulseBinding.embedView({
                          slotId: 'first-pulse',
                          model: model.firstPulse,
                          viewInputs: {},
                        }),
                      )
                    : h.empty,
                  h.block(
                    SecondPulseBinding.embedView({
                      slotId: 'second-pulse',
                      model: model.secondPulse,
                      viewInputs: {},
                    }),
                  ),
                ]),
              ],
            ),
            standalonePulse ? h.empty : ChartLoadingLabel(h, label),
          ],
        ),
        ...(standalonePulse
          ? [
              h.output(
                [h.Id('public-pulse-state')],
                [`Cycles ${model.pulseCycles}; epoch ${model.epoch}`],
              ),
            ]
          : [
              h.block(
                PlaceholderBinding.embedView({
                  slotId: 'public-loading-bar',
                  model: model.placeholder,
                  viewInputs: placeholderInputs,
                }),
              ),
              h.svg(
                [h.ViewBox('0 0 400 140'), h.Width('400'), h.Height('140')],
                [
                  h.block(
                    StandaloneSweepBinding.embedView({
                      slotId: 'public-standalone-sweep',
                      model: model.standaloneSweep,
                      viewInputs: lineLoadingSweepInputs({ curve: curveMonotoneX }),
                    }),
                  ),
                ],
              ),
              model.isLineVisible
                ? h.block(
                    LineBinding.embedView({
                      slotId: 'public-loading-line',
                      model: model.line,
                      viewInputs: lineInputs,
                    }),
                  )
                : h.empty,
              h.output(
                [h.Id('public-loading-state')],
                [
                  `Placeholder ${model.placeholder.phase}; rows ${model.placeholder.data.length}; cycles ${model.pulseCycles}; epoch ${model.epoch}; focus ${Option.getOrNull(model.line.focusedIndex) ?? 'none'}`,
                ],
              ),
              h.p([], [`Deterministic skeleton sample: ${getSkeletonHeights(4).join(', ')}`]),
              h.output(
                [h.Id('public-sweep-state')],
                [
                  `Sweeps completed ${model.sweepCompletions}; standalone tick ${model.standaloneSweep.tick}; context tick ${model.contextSweep.tick}`,
                ],
              ),
            ]),
      ],
    )
  }),
  EffectsLayer: FocusReplay.layer,
}).pipe(Layer.provide(childLayers))
