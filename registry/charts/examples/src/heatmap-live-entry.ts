import { Button } from '@foldkit/ui'
import { DateTime, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  HeatmapChart,
  HeatmapCells,
  HeatmapXAxis,
  HeatmapYAxis,
  HeatmapTooltip,
  HeatmapSeparator,
  HeatmapLegend,
  HeatmapInteractionBoundary,
} from '@foldkit-visuals/charts/heatmap'
import type { HeatmapChartProps } from '@foldkit-visuals/charts/heatmap'
import { LiveLineChart, LiveLine, LiveXAxis, LiveYAxis } from '@foldkit-visuals/charts/live-line'
import type { LiveLineChartProps } from '@foldkit-visuals/charts/live-line'
import { ChartTooltip } from '@foldkit-visuals/charts/line'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

const flags = new URLSearchParams(window.location.search)

const heatmap = HeatmapChart({ name: 'heatmap-complete' })

const live = LiveLineChart({ name: 'liveline-complete' })

export const HeatmapKey = Symbol('HeatmapLiveHeatmap')

export const LiveKey = Symbol('HeatmapLiveLine')

const HeatmapBlock = Block.make(heatmap.namespace, { ...heatmap.contract, key: HeatmapKey })

const LiveBlock = Block.make(live.namespace, { ...live.contract, key: LiveKey })

const chartLayers = Layer.mergeAll(
  HeatmapBlock.makeLayer(heatmap.plans<typeof HeatmapKey>(HeatmapBlock)),
  LiveBlock.makeLayer(live.plans<typeof LiveKey>(LiveBlock)),
)

const heatData = Array.from({ length: 12 }, (_, column) => ({
  bin: column,
  bins: Array.from({ length: 7 }, (_value, row) => ({
    bin: row,
    count: (column * 3 + row) % 5,
    date: DateTime.toDateUtc(DateTime.makeUnsafe(Date.UTC(2026, 9, 4 + column * 7 + row))),
  })),
}))

const epoch =
  Number(flags.get('epoch')) || Math.floor(DateTime.toEpochMillis(DateTime.nowUnsafe()) / 1000) - 39

const liveData = Array.from({ length: 40 }, (_, index) => ({
  time: epoch + index,
  value: 45 + Math.sin(index / 4) * 15,
}))

const heatProps: HeatmapChartProps = {
  data: heatData,
  animate: !flags.has('still'),
  status: flags.has('loading') ? 'loading' : 'ready',
  loadingLabel: 'Loading',
  weekStartDay: flags.has('monday') ? 1 : 0,
  children: [
    HeatmapCells({ hideGhostCells: false }),
    HeatmapXAxis(),
    HeatmapYAxis(),
    HeatmapTooltip({ instant: flags.has('instant') }),
    HeatmapSeparator({ every: 4, spacing: 12, showLabels: true }),
  ],
}

const liveProps: LiveLineChartProps = {
  data: liveData,
  value: liveData.at(-1)?.value ?? 0,
  window: 30,
  paused: flags.has('paused'),
  style: { height: 240 },
  children: [
    LiveLine({ dataKey: 'value' }),
    LiveXAxis(),
    LiveYAxis({ position: flags.has('right') ? 'right' : 'left' }),
    ChartTooltip(),
  ],
}

const styledHeatProps: HeatmapChartProps = {
  ...heatProps,
  children: (heatProps.children ?? []).map((child) =>
    child.kind === 'heatmapTooltip'
      ? HeatmapTooltip({
          ...child.props,
          backgroundColor: 'red',
          panelStyle: {
            backgroundColor: 'rgb(24, 64, 96)',
            padding: 12,
            width: 220,
            transform: 'translateX(8px)',
            '--tooltip-source-accent': 'gold',
          },
        })
      : child,
  ),
}

const styledHeatInputs = heatmap.inputs('heatmap', styledHeatProps)
const styledHeatReplayInputs = heatmap.inputs('heatmap', {
  ...styledHeatProps,
  revealSignature: 'replayed',
})

const heatInputs = heatmap.inputs('heatmap', heatProps)

const heatReplayInputs = heatmap.inputs('heatmap', { ...heatProps, revealSignature: 'replayed' })

const liveInputs = live.inputs('live', liveProps)

const Model = Schema.Struct({
  heatmap: HeatmapBlock.Model,
  live: LiveBlock.Model,
  isVisible: Schema.Boolean,
  isPaused: Schema.Boolean,
  sequence: Schema.Int,
  isReplayed: Schema.Boolean,
  isTooltipStyled: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedReplay: {},
  ClickedTooltipStyle: {},
  ClickedEmpty: {},
  ClickedRestore: {},
  ClickedUnmount: {},
  ClickedAppended: {},
  ClickedPause: {},
  UpdatedLegendLevel: { level: Schema.NullOr(Schema.Int) },
})

export const HeatmapLiveFixtureKey = Symbol('HeatmapLiveFixture')

const HeatmapLiveFixtureBlock = Block.make('HeatmapLiveFixture', {
  key: HeatmapLiveFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const HeatmapBinding = HeatmapLiveFixtureBlock.makeRequiredFieldBinding(HeatmapBlock, {
  field: 'heatmap',
  init: { contextToArgs: () => ['heatmap', heatData, heatmap.configuration()] },
})

const LiveBinding = HeatmapLiveFixtureBlock.makeRequiredFieldBinding(LiveBlock, {
  field: 'live',
  init: { contextToArgs: () => ['live', liveData, live.configuration(liveProps)] },
})

const HeatmapLiveFixtureComposition = HeatmapLiveFixtureBlock.makeComposition({
  bindings: [HeatmapBinding, LiveBinding],
})

const layer = HeatmapLiveFixtureBlock.makeLayer({
  init: HeatmapLiveFixtureComposition.makeInit(() => ({
    model: {
      isVisible: true,
      isPaused: false,
      sequence: 0,
      isReplayed: false,
      isTooltipStyled: false,
    },
  })),
  update: HeatmapLiveFixtureComposition.makeUpdate({
    ClickedReplay: (m) => ({ model: { ...m, isReplayed: !m.isReplayed } }),
    ClickedTooltipStyle: (m) => ({ model: { ...m, isTooltipStyled: !m.isTooltipStyled } }),
    ClickedEmpty: Update.combineSteps([
      HeatmapBinding.requestData({ data: [] }),
      LiveBinding.requestData({ data: [] }),
    ]),
    ClickedRestore: Update.combineSteps([
      HeatmapBinding.requestData({ data: heatData }),
      LiveBinding.requestData({ data: liveData }),
    ]),
    ClickedUnmount: (m) => ({ model: { ...m, isVisible: !m.isVisible } }),
    ClickedAppended: HeatmapLiveFixtureBlock.makeStep((m) =>
      Update.combineSteps([
        HeatmapLiveFixtureBlock.makeFieldsStep(() => ({ sequence: () => m.sequence + 1 })),
        LiveBinding.requestData({
          data: [...m.live.data, { time: epoch + 40 + m.sequence, value: 50 + m.sequence * 3 }],
        }),
      ]),
    ),
    ClickedPause: HeatmapLiveFixtureBlock.makeStep((m) =>
      Update.combineSteps([
        HeatmapLiveFixtureBlock.makeFieldsStep(() => ({ isPaused: () => !m.isPaused })),
        LiveBinding.requestConfiguration({
          configuration: live.configuration({
            ...liveProps,
            data: m.live.data,
            paused: !m.isPaused,
          }),
        }),
      ]),
    ),
    UpdatedLegendLevel: HeatmapLiveFixtureBlock.makeStep(
      (_m, { level }: ReturnType<typeof Message.UpdatedLegendLevel>) =>
        Update.combineSteps([HeatmapBinding.requestLegendLevel({ level })]),
    ),
  }),
  view: HeatmapLiveFixtureComposition.makeView((m, h) => {
    const tooltipInputs = m.isTooltipStyled ? styledHeatInputs : heatInputs
    const replayInputs = m.isTooltipStyled ? styledHeatReplayInputs : heatReplayInputs
    const focus = Option.getOrNull(m.heatmap.focusedIndex)
    const level = Option.getOrNull(m.heatmap.hoveredLegendLevel)

    const column = focus === null ? undefined : m.heatmap.data[Math.floor(focus / 7)]
    const bin = focus === null ? undefined : column?.bins[focus % 7]

    const interaction = {
      hoveredLegendLevel: level,
      hoveredCell:
        focus === null || bin === undefined
          ? null
          : { column: Math.floor(focus / 7), row: focus % 7, count: bin.count },
      requestLegendLevel: (next: number | null) => Message.UpdatedLegendLevel({ level: next }),
    }

    return h.div(
      [],
      [
        h.nav(
          [],
          [
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
                onClick: Message.ClickedAppended(),
                toView: (attributes) => h.button([...attributes.button], ['Append sample']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedPause(),
                toView: (attributes) => h.button([...attributes.button], ['Pause']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedReplay(),
                toView: (attributes) => h.button([...attributes.button], ['Replay']),
              },
              h,
            ),
            Button.view(
              {
                onClick: Message.ClickedTooltipStyle(),
                toView: (attributes) => h.button([...attributes.button], ['Toggle tooltip style']),
              },
              h,
            ),
          ],
        ),
        HeatmapInteractionBoundary(
          {
            children: [
              h.section(
                [h.Class('[width:640px] [max-width:100%]'), h.Id('heatmap-fixture')],
                m.isVisible
                  ? [
                      h.block(
                        HeatmapBinding.embedView({
                          slotId: 'heatmap',
                          model: m.heatmap,
                          viewInputs: m.isReplayed ? replayInputs : tooltipInputs,
                        }),
                      ),
                    ]
                  : [],
              ),
              HeatmapLegend({}, h, 'heatmap-legend-fixture', interaction),
            ],
          },
          h,
          interaction,
        ),
        h.section(
          [h.Class('[width:640px] [max-width:100%] [min-height:240px]'), h.Id('live-fixture')],
          m.isVisible
            ? [
                h.block(
                  LiveBinding.embedView({
                    slotId: 'live',
                    model: m.live,
                    viewInputs: liveInputs,
                  }),
                ),
              ]
            : [],
        ),
      ],
    )
  }),
}).pipe(Layer.provide(chartLayers))

await document.fonts.load('500 14px Geist')

Runtime.run(
  Program.makeElement({
    block: HeatmapLiveFixtureBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
