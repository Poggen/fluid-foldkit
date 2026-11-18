import { it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { GalleryBlock, layer } from './block'
import { Message } from './definition'
import { prepareGalleryFlags } from './flags'

const subject = { block: GalleryBlock, layer }

it.effect('publishes a chart fact only for newly accepted chart previews', () =>
  Effect.gen(function* () {
    const flags = yield* prepareGalleryFlags
    const initial = yield* Story.withBlock(subject, (gallery) => gallery.init(flags).model)
    yield* Story.story(
      subject,
      Story.given(initial),
      Story.message(
        Message.ObservedPreviews({ hrefs: ['/components/input'], admissionRevision: 0 }),
      ),
      Story.expectNoOutMessage(),
      Story.message(Message.ObservedPreviews({ hrefs: ['/charts/gauge'], admissionRevision: 0 })),
      Story.expectOutMessage(GalleryBlock.OutMessage.AdmittedChartPreviews()),
      Story.model((model) => {
        expect(model.admitted).toContain('/charts/gauge')
        expect(Option.isSome(model.cartesian.gauge)).toBe(true)
      }),
      Story.models(
        Story.steps(
          Story.message(
            Message.ObservedPreviews({ hrefs: ['/charts/gauge'], admissionRevision: 0 }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    )
  }),
)

it.effect('resets admission while rejecting queued observations from earlier lifetimes', () =>
  Effect.gen(function* () {
    const flags = yield* prepareGalleryFlags
    const initial = yield* Story.withBlock(subject, (gallery) => gallery.init(flags).model)
    expect(Option.isNone(initial.cartesian.gauge)).toBe(true)
    const observed = yield* Story.story(
      subject,
      Story.given(initial),
      Story.message(
        Message.ObservedPreviews({
          hrefs: ['/components/input', '/charts/gauge'],
          admissionRevision: initial.admissionRevision,
        }),
      ),
      Story.expectOutMessage(GalleryBlock.OutMessage.AdmittedChartPreviews()),
    )
    const gauge = Option.getOrThrow(observed.cartesian.gauge)
    yield* Story.story(
      subject,
      Story.given(observed),
      Story.inMessage(GalleryBlock.InMessage.RequestedAdmissionReset()),
      Story.expectNoOutMessage(),
      Story.inMessage(GalleryBlock.InMessage.RequestedAdmissionReset()),
      Story.expectNoOutMessage(),
      Story.model((model) => {
        expect(model.admissionRevision).toBe(initial.admissionRevision + 2)
        expect(model.admitted).toEqual([])
        expect(model.fluid).toBe(observed.fluid)
        expect(model.cartesian).toBe(observed.cartesian)
        expect(Option.getOrThrow(model.cartesian.gauge)).toBe(gauge)
        expect(model.companions).toBe(observed.companions)
      }),
      Story.models(
        Story.steps(
          Story.message(
            Message.ObservedPreviews({
              hrefs: ['/components/input', '/charts/line'],
              admissionRevision: initial.admissionRevision,
            }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.expectNoOutMessage(),
      Story.model((model) => expect(Option.isNone(model.cartesian.line)).toBe(true)),
      Story.messageWith((model) =>
        Message.ObservedPreviews({
          hrefs: ['/components/input', '/charts/gauge'],
          admissionRevision: model.admissionRevision,
        }),
      ),
      Story.expectOutMessage(GalleryBlock.OutMessage.AdmittedChartPreviews()),
      Story.model((model) => {
        expect(model.admitted).toContain('/components/input')
        expect(model.fluid).toBe(observed.fluid)
        expect(Option.getOrThrow(model.cartesian.gauge)).toBe(gauge)
      }),
      Story.Command.expectNone(),
    )
  }),
)

it.effect('retains one measured footprint per card and rejects stale lifetime geometry', () =>
  Effect.gen(function* () {
    const flags = yield* prepareGalleryFlags
    const initial = yield* Story.withBlock(subject, (gallery) => gallery.init(flags).model)
    const href = '/components/input'
    const measurement = { width: 342, layout: 'default:sans', height: 163 }
    yield* Story.story(
      subject,
      Story.given(initial),
      Story.message(
        Message.MeasuredPreviewHeights({ heights: { [href]: measurement }, admissionRevision: 0 }),
      ),
      Story.models(
        Story.steps(
          Story.message(
            Message.MeasuredPreviewHeights({
              heights: { [href]: measurement },
              admissionRevision: 0,
            }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.message(
        Message.MeasuredPreviewHeights({
          heights: { [href]: { width: 500, layout: 'compact:sans', height: 155 } },
          admissionRevision: 0,
        }),
      ),
      Story.model((model) =>
        expect(model.previewHeights).toEqual({
          [href]: { width: 500, layout: 'compact:sans', height: 155 },
        }),
      ),
      Story.inMessage(GalleryBlock.InMessage.RequestedAdmissionReset()),
      Story.models(
        Story.steps(
          Story.message(
            Message.MeasuredPreviewHeights({
              heights: { [href]: measurement },
              admissionRevision: 0,
            }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    )
  }),
)
