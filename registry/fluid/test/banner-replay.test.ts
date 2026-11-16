import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Scene, Story } from 'foldkit'
import { Effect, Option, Schema } from 'effect'
import { BannerBlock, layer, test as bannerTest } from '../src/banner.js'

const subject = { block: BannerBlock, layer }
const { CaptureReducedMotion } = bannerTest
const Json = Schema.fromJsonString(BannerBlock.Model)
const replay = (model: typeof BannerBlock.Model.Type) =>
  Schema.decodeSync(Json)(Schema.encodeSync(Json)(model))
const preference = (mountGeneration: number, value = false) =>
  Story.steps(
    Story.Command.expectExact(CaptureReducedMotion({ mountGeneration })),
    Story.Command.resolve(
      CaptureReducedMotion,
      BannerBlock.Message.CapturedReducedMotion({ mountGeneration, value }),
    ),
  )

test.effect(
  'controlled dismiss notifies without changing visibility; releasing control preserves local policy',
  () =>
    Effect.gen(function* controlledBanner() {
      const dismissed = yield* Story.story(
        subject,
        Story.init({ id: 'controlled', open: true, reduceMotion: false }),
        preference(0),
        Story.inMessage(BannerBlock.InMessage.RequestedDismiss()),
        Story.model((model) => {
          expect(model.phase).toBe('Present')
        }),
        Story.expectOutMessage(BannerBlock.OutMessage.Dismissed()),
      )
      yield* Story.story(
        subject,
        Story.given(replay(dismissed)),
        Story.inMessage(BannerBlock.InMessage.RequestedConfigureOpen({ open: false })),
        Story.model((model) => {
          expect(model.phase).toBe('Exiting')
        }),
        Story.inMessage(BannerBlock.InMessage.RequestedConfigureOpen({ open: null })),
        Story.model((model) => {
          expect(Option.isNone(model.controlledOpen)).toBe(true)
          expect(model.phase).toBe('Present')
        }),
        Story.Command.expectNone(),
      )
    }),
)

test.effect(
  'uncontrolled dismiss, reopen and stale exit completion survive model round trips',
  () =>
    Effect.gen(function* interruptedBanner() {
      const exiting = yield* Story.story(
        subject,
        Story.init({ id: 'local', reduceMotion: false }),
        preference(0),
        Story.inMessage(BannerBlock.InMessage.RequestedDismiss()),
        Story.model((model) => {
          expect(model.phase).toBe('Exiting')
        }),
      )
      const closedAgain = yield* Story.story(
        subject,
        Story.given(replay(exiting)),
        Story.inMessage(BannerBlock.InMessage.RequestedOpen()),
        Story.model((model) => {
          expect(model.phase).toBe('Present')
        }),
        Story.message(BannerBlock.Message.CompletedExit({ generation: exiting.generation })),
        Story.model((model) => {
          expect(model.phase).toBe('Present')
        }),
        Story.inMessage(BannerBlock.InMessage.RequestedDismiss()),
      )
      yield* Story.story(
        subject,
        Story.given(closedAgain),
        Story.message(BannerBlock.Message.CompletedExit({ generation: closedAgain.generation })),
        Story.model((model) => {
          expect(model.phase).toBe('Closed')
        }),
        Story.expectOutMessage(BannerBlock.OutMessage.Exited()),
        Story.inMessage(BannerBlock.InMessage.RequestedOpen()),
        Story.model((model) => {
          expect(model.initial).toBe(true)
        }),
        Story.Command.expectNone(),
      )
    }),
)

test.effect('lifecycle reset cancels exits and restores source component mount defaults', () =>
  Effect.gen(function* resetBanner() {
    const exiting = yield* Story.story(
      subject,
      Story.init({ id: 'local', reduceMotion: false }),
      preference(0),
      Story.inMessage(BannerBlock.InMessage.RequestedDismiss()),
    )
    yield* Story.story(
      subject,
      Story.given(exiting),
      Story.inMessage(BannerBlock.InMessage.RequestedReset()),
      preference(1),
      Story.model((model) => {
        expect(model.phase).toBe('Present')
        expect(model.initial).toBe(false)
        expect(model.localOpen).toBe(true)
      }),
    )
    yield* Story.story(
      subject,
      Story.given(exiting),
      Story.message(BannerBlock.Message.CompletedExit({ generation: exiting.generation })),
      Story.inMessage(BannerBlock.InMessage.RequestedReset()),
      preference(1),
      Story.model((model) => {
        expect(model.phase).toBe('Present')
      }),
    )
    yield* Story.story(
      subject,
      Story.init({ id: 'controlled', open: true, reduceMotion: false }),
      preference(0),
      Story.inMessage(BannerBlock.InMessage.RequestedConfigureOpen({ open: false })),
      Story.inMessage(BannerBlock.InMessage.RequestedReset()),
      preference(1),
      Story.model((model) => {
        expect(model.phase).toBe('Closed')
      }),
    )
  }),
)

test.effect(
  'preference capture belongs to one component mount and stale completions cannot change its successor',
  () =>
    Effect.gen(function* mountPreference() {
      const original = CaptureReducedMotion({ mountGeneration: 0 })
      const successor = CaptureReducedMotion({ mountGeneration: 1 })
      yield* Scene.scene(
        {
          ...subject,
          viewInputs: { children: () => [], animate: (node) => node },
        },
        Scene.init({ id: 'preference', reduceMotion: false }),
        Scene.Command.expectExact(original),
        Scene.Command.keepPending(original),
        Scene.inMessage(BannerBlock.InMessage.RequestedReset()),
        Scene.Command.expectExactInOrder(original, successor),
        Scene.Command.resolve(
          original,
          BannerBlock.Message.CapturedReducedMotion({ mountGeneration: 0, value: true }),
        ),
        Scene.Command.expectExact(successor),
        Scene.Command.resolve(
          successor,
          BannerBlock.Message.CapturedReducedMotion({ mountGeneration: 1, value: true }),
        ),
        Scene.Command.expectNone(),
      )
      yield* Story.story(
        subject,
        Story.init({ id: 'preference', reduceMotion: false }),
        Story.inMessage(BannerBlock.InMessage.RequestedReset()),
        Story.Command.expectExactInOrder(original, successor),
        Story.Command.resolve(
          original,
          BannerBlock.Message.CapturedReducedMotion({ mountGeneration: 0, value: true }),
        ),
        Story.model((model) => {
          expect(model.reduceMotion).toBe(false)
          expect(model.mountGeneration).toBe(1)
        }),
        Story.Command.resolve(
          successor,
          BannerBlock.Message.CapturedReducedMotion({ mountGeneration: 1, value: true }),
        ),
        Story.model((model) => expect(model.reduceMotion).toBe(true)),
        Story.inMessage(BannerBlock.InMessage.RequestedConfigureOpen({ open: false })),
        Story.model((model) => expect(model.reduceMotion).toBe(true)),
        Story.inMessage(BannerBlock.InMessage.RequestedConfigureOpen({ open: true })),
        Story.model((model) => expect(model.reduceMotion).toBe(true)),
        Story.Command.expectNone(),
      )
    }),
)
