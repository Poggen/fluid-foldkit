import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { BarChartLoading } from '../src/bar/loading-root'

const placeholder = BarChartLoading('bar-sweep-observation')

export const BarSweepKey = Symbol('BarSweepObservation')

const chart = Block.make(placeholder.namespace, { key: BarSweepKey, ...placeholder.contract })

const subject = { block: chart, layer: chart.makeLayer(placeholder.plans(chart)) }

const mounted = (generation: number) =>
  chart.Message.ObservedSweepCycle({ kind: 'mounted', generation, seriesId: 'bar-skeleton' })

it.effect(
  'duplicate mounted cannot reset a completed loading cycle and stale remount is ignored',
  () =>
    Story.story(
      subject,
      Story.init('bar-sweep-observation', placeholder.data, placeholder.configuration),
      Story.messageWith((model) => mounted(model.generation)),
      Story.model((model) => expect(model.sweepCycles['bar-skeleton']).toBe(0)),
      Story.models(
        Story.steps(
          Story.messageWith((model: typeof chart.Model.Type) => mounted(model.generation)),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.messageWith((model) =>
        chart.Message.ObservedSweepCycle({
          kind: 'cycle',
          generation: model.generation,
          seriesId: 'bar-skeleton',
        }),
      ),
      Story.model((model) => expect(model.sweepCycles['bar-skeleton']).toBe(1)),
      Story.models(
        Story.steps(
          Story.messageWith((model: typeof chart.Model.Type) => mounted(model.generation)),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.messageWith((model) =>
        chart.Message.ObservedSweepCycle({
          kind: 'removed',
          generation: model.generation,
          seriesId: 'bar-skeleton',
        }),
      ),
      Story.model((model) => expect(model.sweepCycles['bar-skeleton']).toBeUndefined()),
      Story.messageWith((model) => mounted(model.generation)),
      Story.model((model) => expect(model.sweepCycles['bar-skeleton']).toBe(0)),
      Story.models(
        Story.steps(
          Story.messageWith((model: typeof chart.Model.Type) => mounted(model.generation + 1)),
        ),
        (before, after) => expect(after).toBe(before),
      ),
    ),
)
