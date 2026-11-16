import { Schema } from 'effect'
import { expect } from 'vitest'
import { it as effectIt } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { LineChart } from '../src/index'
import type { Domains } from '../src/cartesian/state'
import type { ChartViewport } from '../src/cartesian/viewport'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const recipe = LineChart({ name: 'domain-observation-contract', Row })

export const DomainObservationKey = Symbol('DomainObservation')

const ChartBlock = Block.make(recipe.namespace, { key: DomainObservationKey, ...recipe.contract })

const subject = { block: ChartBlock, layer: ChartBlock.makeLayer(recipe.plans(ChartBlock)) }

const domains: Domains = { left: [0, 4] }

const viewport: ChartViewport = {
  width: 320,
  height: 180,
  margin: { top: 40, right: 40, bottom: 40, left: 40 },
  xDomain: [0, 172_800_000],
}

const observation = () =>
  ChartBlock.Message.ObservedDomains({
    current: { left: [0, 4] },
    target: { left: [0, 4] },
    viewport: { ...viewport, margin: { ...viewport.margin }, xDomain: [0, 172_800_000] },
  })

effectIt.effect('repeated equal draw observations settle without allocating another model', () =>
  Story.story(
    subject,
    Story.init('measurement-owner', []),
    Story.message(observation()),
    Story.models(
      Story.steps(
        ...Array.from({ length: 20 }, () => Story.message(observation())),
        Story.message(ChartBlock.Message.ObservedDomains({ current: domains, target: domains })),
      ),
      (before, after) => expect(after).toBe(before),
    ),
    Story.Command.expectNone(),
  ),
)

effectIt.effect('changed domain, tween target and viewport still publish measured state', () =>
  Story.story(
    subject,
    Story.init('measurement-owner', []),
    Story.message(observation()),
    Story.models(
      Story.steps(
        Story.message(
          ChartBlock.Message.ObservedDomains({
            current: domains,
            target: { left: [0, 8] },
            viewport,
          }),
        ),
      ),
      (before, after) => {
        expect(after).not.toBe(before)
        expect(after.yTweens).toBe(true)
      },
    ),
    Story.models(
      Story.steps(
        Story.message(
          ChartBlock.Message.ObservedDomains({
            current: { left: [0, 8] },
            target: { left: [0, 8] },
            viewport: { ...viewport, width: 420 },
          }),
        ),
      ),
      (before, after) => {
        expect(after.domains).toEqual({ left: [0, 8] })
        expect(after.yTweens).toBe(false)
        expect(after.viewport).not.toEqual(before.viewport)
      },
    ),
    Story.models(
      Story.steps(
        Story.message(
          ChartBlock.Message.ObservedDomains({
            current: { left: [0, 8] },
            target: { left: [0, 8] },
            viewport: { ...viewport, width: 420 },
          }),
        ),
      ),
      (before, after) => expect(after).toBe(before),
    ),
    Story.Command.expectNone(),
  ),
)

effectIt.effect('equal measurements still acknowledge a data snap and retain option changes', () =>
  Story.story(
    subject,
    Story.init('measurement-owner', []),
    Story.message(observation()),
    Story.inMessage(
      ChartBlock.InMessage.RequestedConfigure({
        configuration: { ...recipe.configuration({ children: [] }), animationDuration: 250 },
      }),
    ),
    Story.inMessage(ChartBlock.InMessage.RequestedData({ data: [] })),
    Story.model((model) => expect(model.updateStep).toBe('snap')),
    Story.models(Story.steps(Story.message(observation())), (before, after) => {
      expect(after).not.toBe(before)
      expect(after.updateStep).toBe('none')
      expect(after.yDomainFrom).toEqual({})
      expect(after.configuration.animationDuration).toBe(250)
    }),
    Story.models(Story.steps(Story.message(observation())), (before, after) =>
      expect(after).toBe(before),
    ),
    Story.inMessage(ChartBlock.InMessage.RequestedData({ data: [] })),
    Story.message(
      ChartBlock.Message.ObservedDomains({ current: domains, target: { left: [0, 8] }, viewport }),
    ),
    Story.model((model) => {
      expect(model.updateStep).toBe('glide')
      expect(model.yTweens).toBe(true)
    }),
    Story.Command.expectNone(),
  ),
)
