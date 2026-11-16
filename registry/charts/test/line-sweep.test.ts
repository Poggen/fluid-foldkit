import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { Server } from 'foldkit/experimental'
import { it as effectIt } from '@effect/vitest'
import { curveLinear, curveMonotoneX } from 'd3-shape'
import type { CurveFactory } from 'd3-shape'
import { expect, it } from 'vitest'
import {
  LineLoadingSweepBlock,
  LineLoadingSweepLayer,
  lineLoadingSweepConfiguration,
  lineLoadingSweepInputs,
} from '../src/kit/loading/line-sweep'

const sweep = LineLoadingSweepBlock

const subject = { block: sweep, layer: LineLoadingSweepLayer }

const customCurve: CurveFactory = (context) => curveLinear(context)

it('keeps arbitrary pure curve identity outside configuration and closes numeric dimension inputs', () => {
  const configuration = lineLoadingSweepConfiguration({ curve: curveLinear, mode: 'exit' })
  const dimensions = { innerWidth: 30, innerHeight: 100, draw: () => 'not a dimension' }
  const inputs = lineLoadingSweepInputs({ curve: curveLinear }, dimensions)

  expect(configuration).toEqual({ mode: 'exit' })
  expect(inputs.curve()).toBe(curveLinear)
  expect(inputs.dimensions).toEqual({ innerWidth: 30, innerHeight: 100 })
  expect(inputs.dimensions).not.toBe(dimensions)
  expect(lineLoadingSweepInputs({ curve: curveMonotoneX }).curve()).toBe(curveMonotoneX)
  expect(lineLoadingSweepInputs({ curve: customCurve }).curve()).toBe(customCurve)
  expect(lineLoadingSweepInputs({ curve: curveLinear }).dimensions).toEqual({
    innerWidth: 0,
    innerHeight: 0,
  })
})

effectIt.effect(
  'admits one reduced completion per committed classification and ignores invalidated classification facts',
  () => {
    const observed = sweep.Message.ObservedCommittedClassification({
      reducedMotion: true,
      isLoop: false,
    })

    return Story.story(
      subject,
      Story.init(
        'reduced-sweep',
        lineLoadingSweepConfiguration({ curve: curveLinear, mode: 'exit' }),
        true,
      ),
      Story.model((model) => {
        expect(model.tick).toBe(0)
        expect(Option.isNone(model.committedClassification)).toBe(true)
      }),
      Story.message(observed),
      Story.expectOutMessage(
        sweep.OutMessage.TransitionCompleted({ mode: 'exit', source: 'reducedMotion' }),
      ),
      Story.message(observed),
      Story.expectNoOutMessage(),
      Story.inMessage(
        sweep.InMessage.RequestedConfigure({
          configuration: lineLoadingSweepConfiguration({ curve: curveLinear, mode: 'enter' }),
        }),
      ),
      Story.message(observed),
      Story.expectNoOutMessage(),
      Story.inMessage(
        sweep.InMessage.RequestedConfigure({
          configuration: lineLoadingSweepConfiguration({ curve: curveLinear }),
        }),
      ),
      Story.models(Story.steps(Story.message(observed)), (before, after) =>
        expect(after).toBe(before),
      ),
    )
  },
)

effectIt.effect(
  'holds the seed in transitions while admitting an event from the previously painted loop',
  () => {
    return Story.story(
      subject,
      Story.init(
        'seed-sweep',
        lineLoadingSweepConfiguration({ curve: curveLinear, mode: 'exit' }),
        false,
      ),
      Story.models(
        Story.steps(Story.message(sweep.Message.ObservedSweepCycle({ observedLoop: false }))),
        (before, after) => expect(after).toBe(before),
      ),
      Story.message(sweep.Message.ObservedSweepCycle({ observedLoop: true })),
      Story.model((model) => {
        expect(model.tick).toBe(1)
        expect(model.configuration.mode).toBe('exit')
      }),
      Story.message(sweep.Message.ObservedTransitionEnd({ observedMode: 'enter' })),
      Story.model((model) => {
        expect(model.tick).toBe(1)
      }),
      Story.expectOutMessage(
        sweep.OutMessage.TransitionCompleted({ mode: 'enter', source: 'animation' }),
      ),
    )
  },
)

const Model = Schema.Struct({ sweep: sweep.Model })

export const LineSweepServerKey = Symbol('LineSweepServerContract')

const Parent = Block.make('LineSweepServerContract', {
  key: LineSweepServerKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Binding = Parent.makeRequiredFieldBinding(sweep, {
  field: 'sweep',
  init: {
    contextToArgs: () => [
      'server-sweep',
      lineLoadingSweepConfiguration({ curve: curveLinear, pointCount: 4, innerHeight: 100 }),
      false,
    ],
  },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(sweep, {
    TransitionCompleted: Parent.makeNoopStep,
  }),
})

const Composition = Parent.makeComposition({ bindings: [Binding] })

const serverLayerForCurve = (curve: CurveFactory) =>
  Parent.makeLayer({
    init: Composition.makeInit(() => ({ model: {} })),
    update: Composition.makeUpdate({}),
    view: Composition.makeView((model, h) => ({
      title: 'Line sweep native inputs',
      body: h.svg(
        [h.ViewBox('0 0 30 100')],
        [
          h.block(
            Binding.embedView({
              slotId: 'sweep',
              model: model.sweep,
              viewInputs: lineLoadingSweepInputs({ curve }, { innerWidth: 30, innerHeight: 200 }),
            }),
          ),
        ],
      ),
    })),
  }).pipe(Layer.provide(LineLoadingSweepLayer))

effectIt.effect(
  'paints seed-zero line in the actual parent SVG using independent axis fallback',
  () =>
    Effect.gen(function* lineSweepParentSvgContract() {
      const { html } = yield* Server.renderToString(
        { block: Parent, layer: serverLayerForCurve(curveLinear) },
        {},
        { isHydratable: false },
      )

      expect(html).toContain('M0,25L10,77L20,47L30,58')
      expect(html).toContain('id="server-sweep"')
      expect(html).toContain('server-sweep-mask')

      for (const curve of [curveMonotoneX, customCurve]) {
        const { html: curvedHtml } = yield* Server.renderToString(
          { block: Parent, layer: serverLayerForCurve(curve) },
          {},
          { isHydratable: false },
        )

        expect(curvedHtml).toContain(
          curve === curveMonotoneX ? 'M0,25C' : 'M0,25L10,77L20,47L30,58',
        )
        expect(curvedHtml).not.toContain('d=""')
      }
    }),
)
