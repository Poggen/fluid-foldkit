import { Story } from 'foldkit'
import { it } from '@effect/vitest'
import { DateTime, Option, Schema } from 'effect'
import { describe, expect } from 'vitest'
import { defineSharedLegendExample } from './fixtures/legend-parent'

const { Row, Item } = defineSharedLegendExample({})

const rows = [
  Row.make({ date: DateTime.toDateUtc(DateTime.makeUnsafe('2025-01-01T00:00:00Z')), value: 20 }),
]

const items = [
  Item.make({
    label: 'First',
    value: 20,
    color: 'red',
    maxValue: 100,
    description: 'caller metadata',
  }),
  Item.make({ label: 'Second', value: 5, color: 'blue', description: 'another complete row' }),
]

const subject = defineSharedLegendExample({}).Parent
const hover = (index: number | null) =>
  Story.message(subject.block.Message.RequestedLegendIntent({ index }))
const profit = (index: number | null) =>
  Story.message(subject.block.Message.RequestedProfitLossIntent({ index }))

describe('registered shared legend composition', () => {
  it.effect(
    'routes child public hover intent to the chart parent without retaining another hover value',
    () =>
      Story.story(
        subject,
        Story.init('legend-owner', rows, items),
        Story.models(Story.steps(hover(1)), (before, after) => {
          expect(Option.getOrNull(after.chart.hoveredLegend)).toBe(1)
          expect(after.legend).toBe(before.legend)
          expect(after.legend.items).toBe(items)
          expect(after.legend.items[0]).toBe(items[0])
          expect(after.legend.items[0]?.description).toBe('caller metadata')
        }),
        Story.models(Story.steps(hover(null)), (before, after) => {
          expect(Option.isNone(after.chart.hoveredLegend)).toBe(true)
          expect(after.legend).toBe(before.legend)
        }),
      ),
  )
  it.effect(
    'keeps source series and profit/loss hover channels independent on the same chart owner',
    () =>
      Story.story(
        subject,
        Story.init('legend-channels', rows, items),
        Story.models(Story.steps(hover(1), profit(0)), (before, after) => {
          expect(Option.getOrNull(after.chart.hoveredLegend)).toBe(1)
          expect(Option.getOrNull(after.chart.hoveredProfitLossLegend)).toBe(0)
          expect(after.legend).toBe(before.legend)
          expect(after.profitLoss).toBe(before.profitLoss)
        }),
        profit(null),
        Story.model((model) => {
          expect(Option.getOrNull(model.chart.hoveredLegend)).toBe(1)
          expect(Option.isNone(model.chart.hoveredProfitLossLegend)).toBe(true)
        }),
      ),
  )
  it.effect(
    'retains controlled hover across configuration and decodes the new independent channel from an older model',
    () =>
      Story.story(
        subject,
        Story.init('legend-restore', rows, items),
        hover(1),
        Story.message(subject.block.Message.RequestedStatus({ status: 'loading' })),
        Story.model((model) => {
          expect(Option.getOrNull(model.chart.hoveredLegend)).toBe(1)
          const encoded = Schema.encodeSync(subject.block.Model)(model)
          const {
            hoveredProfitLossLegend: _newChannel,
            viewport: _newViewport,
            ...olderChart
          } = encoded.chart
          const restored = Schema.decodeSync(subject.block.Model)({ ...encoded, chart: olderChart })
          expect(Option.getOrNull(restored.chart.hoveredLegend)).toBe(1)
          expect(Option.isNone(restored.chart.hoveredProfitLossLegend)).toBe(true)
          expect(Option.isNone(restored.chart.viewport)).toBe(true)
          expect(restored.legend.items[0]?.description).toBe('caller metadata')
        }),
      ),
  )
})
