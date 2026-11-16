import { Effect, Layer, Schema } from 'effect'
import { it as effectIt } from '@effect/vitest'
import { expect } from 'vitest'
import { Block, Story } from 'foldkit'
import { Server } from 'foldkit/experimental'
import {
  LineLoadingPulseStrokeBlock,
  LineLoadingPulseStrokeLayer,
} from '../src/kit/loading/pulse-view'

const configuration = { pathD: 'M0,0L100,40', innerWidth: 100, innerHeight: 40 }

effectIt.effect('rejects an old physical completion and leaves replay policy with the caller', () =>
  Effect.gen(function* () {
    const subject = { block: LineLoadingPulseStrokeBlock, layer: LineLoadingPulseStrokeLayer }
    const initial = yield* Story.story(subject, Story.init('alpha-pulse', configuration))
    yield* Story.story(
      subject,
      Story.given(initial),
      Story.inMessage(
        LineLoadingPulseStrokeBlock.InMessage.RequestedConfigure({
          configuration: { ...configuration, loopEpoch: 1 },
        }),
      ),
      Story.models(
        Story.steps(
          Story.message(
            LineLoadingPulseStrokeBlock.Message.ObservedCycle({ generation: initial.generation }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.expectNoOutMessage(),
      Story.models(
        Story.steps(
          Story.messageWith((model: typeof LineLoadingPulseStrokeBlock.Model.Type) =>
            LineLoadingPulseStrokeBlock.Message.ObservedCycle({ generation: model.generation }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.expectOutMessage(
        LineLoadingPulseStrokeBlock.OutMessage.CycleCompleted({ mode: 'loop', loopEpoch: 1 }),
      ),
    )
  }),
)

const Model = Schema.Struct({
  alpha: LineLoadingPulseStrokeBlock.Model,
  beta: LineLoadingPulseStrokeBlock.Model,
})

export const PulseServerKey = Symbol('PulseServerContract')

const Parent = Block.make('PulseServerContract', {
  key: PulseServerKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Alpha = Parent.makeRequiredFieldBinding(LineLoadingPulseStrokeBlock, {
  field: 'alpha',
  init: { contextToArgs: () => ['alpha-pulse', configuration] },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(LineLoadingPulseStrokeBlock, {
    CycleCompleted: Parent.makeNoopStep,
  }),
})

const Beta = Parent.makeRequiredFieldBinding(LineLoadingPulseStrokeBlock, {
  field: 'beta',
  init: { contextToArgs: () => ['beta-pulse', configuration] },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(LineLoadingPulseStrokeBlock, {
    CycleCompleted: Parent.makeNoopStep,
  }),
})

const Composition = Parent.makeComposition({ bindings: [Alpha, Beta] })

const layer = Parent.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Public pulse',
    body: h.svg(
      [h.Width('100'), h.Height('40')],
      [
        h.block(Alpha.embedView({ slotId: 'alpha', model: model.alpha, viewInputs: {} })),
        h.block(Beta.embedView({ slotId: 'beta', model: model.beta, viewInputs: {} })),
      ],
    ),
  })),
}).pipe(Layer.provide(LineLoadingPulseStrokeLayer))

effectIt.effect(
  'serializes two real pulse Bindings with unique SVG paint and source-zero initial clip',
  () =>
    Effect.gen(function* pulseServer() {
      const { html } = yield* Server.renderToString(
        { block: Parent, layer },
        {},
        { isHydratable: false },
      )

      expect(html).toContain('id="line-loading-clip-alpha-pulse"')
      expect(html).toContain('id="line-loading-clip-beta-pulse"')
      expect(html).toContain('url(#line-loading-gradient-alpha-pulse)')
      expect(html).toContain('url(#line-loading-gradient-beta-pulse)')
      expect(html).toContain('height="60"')
      expect(html).toContain('translateX(-10px)')
      expect(html).not.toContain('bkm-loading-pulse')
    }),
)
