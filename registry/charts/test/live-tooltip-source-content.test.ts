// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Block, Scene, Story } from 'foldkit'
import { inertHtml as h } from 'foldkit/html'
import { LiveLineChart, LiveLine, LiveXAxis } from '@foldkit-visuals/charts/live-line'
import type { LiveLineChartProps, LiveLineTooltipDatum } from '@foldkit-visuals/charts/live-line'
import { ChartTooltip } from '@foldkit-visuals/charts/line'
import type { ChartTooltipProps } from '@foldkit-visuals/charts/line'
import { Mount, Prepare, ResolveInput } from '../src/live-line/lifecycle'

const recipe = LiveLineChart({ name: 'source-tooltip-content' })
export const LiveTooltipContentKey = Symbol('LiveTooltipContent')
const Chart = Block.make(recipe.namespace, { ...recipe.contract, key: LiveTooltipContentKey })
const subject = { block: Chart, layer: Chart.makeLayer(recipe.plans(Chart)) }
const data = [{ time: 123, value: 7 }]
const observed = { time: 123_000, value: 7, x: 20, y: 30, pinned: false }

const propsFor = (
  content: ChartTooltipProps<LiveLineTooltipDatum>['content'],
): LiveLineChartProps => ({
  data,
  value: 7,
  paused: true,
  children: [
    LiveLine({ dataKey: 'value', formatValue: (value) => `Value: ${value}` }),
    LiveXAxis({ formatTime: () => 'Default time' }),
    ChartTooltip<LiveLineTooltipDatum>(content === undefined ? {} : { content }),
  ],
})

const prepared = (props: LiveLineChartProps) =>
  Story.story(
    subject,
    Story.init('live-tooltip-content', data, recipe.configuration(props)),
    Story.Command.expectExact(ResolveInput({ id: 'live-tooltip-content', generation: 1, data })),
    Story.Command.resolve(
      ResolveInput,
      Chart.Message.CompletedInput({ generation: 1, identity: 'tooltip/1', data }),
    ),
    Story.message(Chart.Message.CompletedPrepare()),
    Story.message(Chart.Message.ObservedTooltip({ tooltip: observed })),
    Story.Command.expectNone(),
  )

const customCases: ReadonlyArray<{
  readonly name: string
  readonly content: NonNullable<ChartTooltipProps<LiveLineTooltipDatum>['content']>
  readonly text: string
}> = [
  { name: 'null', content: () => null, text: '' },
  { name: 'undefined', content: () => undefined, text: '' },
  { name: 'false', content: () => false, text: '' },
  { name: 'empty array', content: () => [], text: '' },
  {
    name: 'custom content',
    content: ({ point, index }) => h.span([], [`Custom ${point.value} at ${index}`]),
    text: 'Custom 7 at 0',
  },
]

for (const scenario of customCases) {
  it.effect(`LiveLine keeps an explicit ${scenario.name} tooltip result`, () =>
    Effect.gen(function* () {
      const props = propsFor(scenario.content)
      const model = yield* prepared(props)
      yield* Scene.scene(
        { ...subject, viewInputs: recipe.inputs('live-tooltip-content', props) },
        Scene.given(model),
        Scene.Mount.resolve(Prepare, Chart.Message.CompletedMount()),
        Scene.Mount.resolve(Mount, Chart.Message.CompletedMount()),
        Scene.expect(
          Scene.selector('#live-tooltip-content-tooltip .ts-chart-tooltip__body'),
        ).toHaveText(scenario.text),
        Scene.expect(Scene.selector('#live-tooltip-content-tooltip')).not.toContainText(
          'Default time',
        ),
        Scene.expect(Scene.selector('#live-tooltip-content-tooltip')).not.toContainText('Value: 7'),
      )
    }),
  )
}

it.effect('LiveLine retains default tooltip content when the callback is absent', () =>
  Effect.gen(function* () {
    const props = propsFor(undefined)
    const model = yield* prepared(props)
    yield* Scene.scene(
      { ...subject, viewInputs: recipe.inputs('live-tooltip-content', props) },
      Scene.given(model),
      Scene.Mount.resolve(Prepare, Chart.Message.CompletedMount()),
      Scene.Mount.resolve(Mount, Chart.Message.CompletedMount()),
      Scene.expect(Scene.selector('#live-tooltip-content-tooltip')).toContainText('Default time'),
      Scene.expect(Scene.selector('#live-tooltip-content-tooltip')).toContainText('Value: 7'),
    )
  }),
)
