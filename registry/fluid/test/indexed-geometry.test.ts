import { expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Story } from 'foldkit'
import { Effect, Option, Schema } from 'effect'
import {
  IndexedGeometry,
  emptyGeometry,
  geometryFromEntries,
  rectAt,
  samePublishedGeometry,
} from '../src/lib/indexed-geometry.js'
import { pickNearestIndexed } from '../src/lib/hover-geometry.js'
import { HoverBlock, layer as HoverLayer } from '../src/hover.js'

const first = { top: 0, left: 0, width: 20, height: 20 }

const moved = { top: 40, left: 0, width: 20, height: 20 }

test.effect('published fractional geometry and sparse holes survive the Model JSON codec', () =>
  Story.story(
    { block: HoverBlock, layer: HoverLayer },
    Story.init({ id: 'fractional-geometry' }),
    Story.message(
      HoverBlock.Message.Measured({
        ready: true,
        itemRects: geometryFromEntries([{ index: 1.5, rect: first }]),
      }),
    ),
    Story.model((model) => {
      expect(model.isMeasured).toBe(true)
      expect(model.itemRects).toEqual(emptyGeometry)
    }),
    Story.message(
      HoverBlock.Message.Measured({
        ready: true,
        itemRects: geometryFromEntries([
          { index: 1.5, rect: first },
          { index: 3, rect: moved },
        ]),
      }),
    ),
  ).pipe(
    Effect.flatMap((model) =>
      Effect.gen(function* fractionalGeometryCodec() {
        expect(model.itemRects.length).toBe(4)
        expect(rectAt(model.itemRects, 1.5)).toEqual(first)
        expect(rectAt(model.itemRects, 2)).toBeUndefined()
        const codec = Schema.fromJsonString(HoverBlock.Model)
        const json = yield* Schema.encodeEffect(codec)(model)
        const restored = yield* Schema.decodeUnknownEffect(codec)(json)
        expect(restored).toEqual(model)
        expect(rectAt(restored.itemRects, 1.5)).toEqual(first)
      }),
    ),
  ),
)

test.effect(
  'fractional changes wait for an integer-slot publication and same-length deletion publishes',
  () => {
    const previous = geometryFromEntries([
      { index: 0, rect: first },
      { index: 3, rect: moved },
      { index: 1.5, rect: first },
    ])

    const changedExtra = geometryFromEntries([
      { index: 0, rect: first },
      { index: 3, rect: moved },
      { index: 1.5, rect: moved },
    ])

    expect(samePublishedGeometry(previous, changedExtra)).toBe(true)

    const withoutExtra = geometryFromEntries([
      { index: 0, rect: first },
      { index: 3, rect: moved },
    ])

    expect(samePublishedGeometry(previous, withoutExtra)).toBe(true)

    const removedInteger = geometryFromEntries([
      { index: 3, rect: moved },
      { index: 1.5, rect: first },
    ])

    expect(removedInteger.length).toBe(previous.length)
    expect(samePublishedGeometry(previous, removedInteger)).toBe(false)

    const changedInteger = geometryFromEntries([{ index: 0, rect: moved }])

    return Story.story(
      { block: HoverBlock, layer: HoverLayer },
      Story.init({ id: 'publication' }),
      Story.message(HoverBlock.Message.Measured({ ready: true, itemRects: previous })),
      Story.message(HoverBlock.Message.Measured({ ready: true, itemRects: changedExtra })),
      Story.model((model) => {
        expect(rectAt(model.itemRects, 1.5)).toEqual(first)
      }),
      Story.message(HoverBlock.Message.Measured({ ready: true, itemRects: withoutExtra })),
      Story.model((model) => {
        expect(rectAt(model.itemRects, 1.5)).toEqual(first)
      }),
      Story.message(HoverBlock.Message.Measured({ ready: true, itemRects: changedInteger })),
      Story.model((model) => {
        expect(rectAt(model.itemRects, 1.5)).toBeUndefined()
      }),
    )
  },
)

test('nearest ignores ordinary numeric properties and retains ascending integer tie order', () => {
  const geometry = geometryFromEntries([
    { index: 3, rect: first },
    { index: 1.5, rect: moved },
    { index: -1, rect: moved },
    { index: 4_294_967_295, rect: moved },
    { index: 0, rect: first },
  ])

  const input = {
    axis: 'y',
    point: { x: 10, y: 50 },
    geometry,
    containerRect: { left: 0, top: 0, width: 100, height: 100 },
    scroll: { x: 0, y: 0 },
    border: { x: 0, y: 0 },
    layoutSize: { width: 100, height: 100 },
  } satisfies Parameters<typeof pickNearestIndexed>[0]

  expect(pickNearestIndexed(input)).toBe(0)
  expect(pickNearestIndexed({ ...input, point: { x: 10, y: 10 } })).toBe(3)
})

test('large sparse indices preserve JS length semantics with only registered entries', () => {
  const geometry = geometryFromEntries([
    { index: 4_294_967_294, rect: first },
    { index: 4_294_967_295, rect: moved },
  ])

  expect(geometry.length).toBe(4_294_967_295)
  expect(geometry.entries).toHaveLength(2)
  expect(rectAt(geometry, 4_294_967_295)).toEqual(moved)
  expect(
    pickNearestIndexed({
      axis: 'y',
      point: { x: 10, y: 50 },
      geometry,
      containerRect: { left: 0, top: 0, width: 100, height: 100 },
      scroll: { x: 0, y: 0 },
      border: { x: 0, y: 0 },
      layoutSize: { width: 100, height: 100 },
    }),
  ).toBe(4_294_967_294)
  expect(geometryFromEntries([{ index: 4_294_967_295, rect: moved }]).length).toBe(0)
})

test('duplicate registration replaces one numeric key and invalid persisted geometry rejects', () => {
  const geometry = geometryFromEntries([
    { index: -0, rect: first },
    { index: 0, rect: moved },
  ])

  expect(geometry).toEqual({ length: 1, entries: [{ index: 0, rect: moved }] })
  expect(
    Option.isNone(
      Schema.decodeUnknownOption(IndexedGeometry)({
        length: 1,
        entries: [
          { index: 0, rect: first },
          { index: 0, rect: moved },
        ],
      }),
    ),
  ).toBe(true)
  expect(
    Option.isNone(
      Schema.decodeUnknownOption(IndexedGeometry)({
        length: 0,
        entries: [{ index: 0, rect: first }],
      }),
    ),
  ).toBe(true)
})

test.effect(
  'direct pointer observations retain finite noninteger registered identities through replay',
  () =>
    Story.story(
      { block: HoverBlock, layer: HoverLayer },
      Story.init({ id: 'fractional-hit' }),
      Story.message(HoverBlock.Message.Registered({ indices: [1.5, -1] })),
      Story.message(HoverBlock.Message.PointerEntered()),
      Story.message(
        HoverBlock.Message.PointerMoved({
          point: { x: 10, y: 10 },
          containerRect: { left: 0, top: 0, width: 100, height: 100 },
          scroll: { x: 0, y: 0 },
          border: { x: 0, y: 0 },
          layoutSize: { width: 100, height: 100 },
          targetIndices: [1.5],
          disabledIndices: [],
        }),
      ),
    ).pipe(
      Effect.flatMap((model) =>
        Effect.gen(function* fractionalPointerCodec() {
          expect(model.activeIndex).toBe(1.5)
          const codec = Schema.fromJsonString(HoverBlock.Model)
          const json = yield* Schema.encodeEffect(codec)(model)
          const restored = yield* Schema.decodeUnknownEffect(codec)(json)
          expect(restored.activeIndex).toBe(1.5)
        }),
      ),
    ),
)
