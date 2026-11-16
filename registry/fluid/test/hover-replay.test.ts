import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { Story } from 'foldkit'
import { HoverBlock, InMessage, layer } from '../src/hover.js'
import { geometryFromEntries } from '../src/lib/indexed-geometry.js'
import type { HoverOptions } from '../src/hover-observation.js'

const ModelJson = Schema.fromJsonString(HoverBlock.Model)

const encode = Schema.encodeSync(ModelJson)

const decode = Schema.decodeUnknownSync(ModelJson)

const InMessageJson = Schema.fromJsonString(Schema.toCodecJson(InMessage))

const encodeInput = Schema.encodeSync(InMessageJson)

const decodeInput = Schema.decodeUnknownSync(InMessageJson)

const subject = { block: HoverBlock, layer }

it.effect('hover requests preserve their behavior after a JSON model round trip', () =>
  Effect.gen(function* preservesReplay() {
    for (const maxDistance of [Infinity, 0, 24]) {
      const initial = yield* Story.story(
        subject,
        Story.init({ id: 'replayed-hover', gapClick: { maxDistance } }),
        Story.Command.expectNone(),
      )

      const serialized = encode(initial)
      expect(serialized).not.toContain('Infinity')
      expect(initial.options.maxDistance).toBe(maxDistance === Infinity ? null : maxDistance)
      let live = initial
      let replayed = decode(serialized)
      expect(replayed).toEqual(live)

      for (const distance of [0, 24, Infinity]) {
        const options: HoverOptions = {
          axis: 'xy',
          nearest: true,
          gapClick: true,
          maxDistance: distance,
        }

        const request = InMessage.RequestedConfigure({ options })
        const restoredRequest = decodeInput(encodeInput(request))
        expect(restoredRequest).toEqual(request)
        const configure = Story.inMessage(restoredRequest)
        const highlight = Story.inMessage(InMessage.RequestedHighlight({ index: 2 }))
        live = yield* Story.story(subject, Story.given(live), configure, highlight)
        replayed = yield* Story.story(
          subject,
          Story.given(decode(encode(replayed))),
          configure,
          highlight,
        )
        expect(replayed).toEqual(live)
        expect(replayed.activeIndex).toBe(2)
        expect(replayed.options.maxDistance).toBe(distance === Infinity ? null : distance)
      }

      yield* Story.story(
        subject,
        Story.given(replayed),
        Story.inMessage(InMessage.RequestedClear()),
        Story.model((model) => {
          expect(model.activeIndex).toBeNull()
        }),
        Story.expectOutMessage(
          HoverBlock.OutMessage.Changed({
            activeIndex: null,
            session: replayed.session,
            itemRects: replayed.itemRects,
            isMeasured: replayed.isMeasured,
          }),
        ),
        Story.Command.expectNone(),
      )
    }
  }),
)

it.effect(
  'standard hover ignores empty-space nearest and gap clicks while preserving explicit focus',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'standard-hover', mode: 'standard', nearest: true, gapClick: true }),
      Story.inMessage(InMessage.RequestedHighlight({ index: 2 })),
      Story.model((model) => {
        expect(model.activeIndex).toBe(2)
      }),
      Story.message(
        HoverBlock.Message.Clicked({
          targetIsItem: false,
          targetIsControl: false,
          point: { x: 1, y: 1 },
          items: [{ index: 2, disabled: false, rect: { top: 0, left: 0, width: 20, height: 20 } }],
        }),
      ),
      Story.Command.expectNone(),
      Story.message(
        HoverBlock.Message.PointerMoved({
          point: { x: 10, y: 10 },
          containerRect: { top: 0, left: 0, width: 100, height: 100 },
          scroll: { x: 0, y: 0 },
          border: { x: 0, y: 0 },
          layoutSize: { width: 100, height: 100 },
          targetIndices: [],
          disabledIndices: [],
        }),
      ),
      Story.model((model) => {
        expect(model.activeIndex).toBeNull()
      }),
      Story.message(
        HoverBlock.Message.PointerMoved({
          point: { x: 10, y: 10 },
          containerRect: { top: 0, left: 0, width: 100, height: 100 },
          scroll: { x: 0, y: 0 },
          border: { x: 0, y: 0 },
          layoutSize: { width: 100, height: 100 },
          targetIndices: [1, 2],
          disabledIndices: [2],
        }),
      ),
      Story.model((model) => {
        expect(model.activeIndex).toBe(1)
        expect(decode(encode(model)).mode).toBe('standard')
      }),
      Story.Command.expectNone(),
    ),
)

it.effect('switching hover mode clears a nearest gap highlight before another pointer move', () => {
  const itemRects = geometryFromEntries([
    { index: 0, rect: { left: 0, top: 0, width: 20, height: 20 } },
  ])

  return Story.story(
    subject,
    Story.init({ id: 'switch-hover-mode', nearest: true, gapClick: true }),
    Story.message(HoverBlock.Message.Measured({ ready: true, itemRects })),
    Story.message(HoverBlock.Message.PointerEntered()),
    Story.message(
      HoverBlock.Message.PointerMoved({
        point: { x: 10, y: 40 },
        containerRect: { left: 0, top: 0, width: 100, height: 100 },
        scroll: { x: 0, y: 0 },
        border: { x: 0, y: 0 },
        layoutSize: { width: 100, height: 100 },
        targetIndices: [],
        disabledIndices: [],
      }),
    ),
    Story.model((model) => {
      expect(model.activeIndex).toBe(0)
    }),
    Story.inMessage(
      InMessage.RequestedConfigure({
        options: {
          mode: 'standard',
          axis: 'y',
          nearest: true,
          gapClick: true,
          maxDistance: Infinity,
        },
      }),
    ),
    Story.model((model) => {
      expect(model.mode).toBe('standard')
      expect(model.activeIndex).toBeNull()
      expect(model.isMeasured).toBe(true)
      expect(model.itemRects).toEqual(itemRects)
    }),
    Story.expectOutMessage(
      HoverBlock.OutMessage.Changed({
        activeIndex: null,
        session: 1,
        itemRects,
        isMeasured: true,
      }),
    ),
    Story.Command.expectNone(),
  )
})
