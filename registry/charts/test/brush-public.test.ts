// @vitest-environment happy-dom
import { DateTime, Effect, Layer, Option, Schema } from 'effect'
import { expect, it } from 'vitest'
import { Area } from '@foldkit-visuals/charts/line'
import { ChartBrush, ChartBrushTrackOverlay } from '@foldkit-visuals/charts/brush'
import { Block, Story } from 'foldkit'
import { it as effectIt } from '@effect/vitest'
import { brushDate, fullExtent, shownRange } from '../src/brush/state'
import { brushControl } from '../src/brush/resource'
import { buildTimeSeriesDefinition } from '../src/cartesian/definition'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'

const Row = Schema.Struct({
  date: Schema.DateFromString,
  value: Schema.Finite,
  label: Schema.String,
})

const date = (time: number) => DateTime.toDateUtc(DateTime.makeUnsafe(time))

const data = [
  { date: date(0), value: 10, label: 'First' },
  { date: date(1000), value: 40, label: 'Last' },
]

const root = ChartBrush({ name: 'brush-owner-contract', Row })

export const BrushOwnerKey = Symbol('Brush')

const BrushBlock = Block.make(root.namespace, { key: BrushOwnerKey, ...root.contract })

const subject = {
  block: BrushBlock,
  layer: BrushBlock.makeLayer(root.plans<typeof BrushOwnerKey>(BrushBlock)),
}

const OtherRow = Schema.Struct({ date: Schema.DateFromString, reading: Schema.Finite })

const other = ChartBrush({ name: 'brush-other-row-contract', Row: OtherRow })

export const OtherBrushKey = Symbol('Brush')

const OtherBrushBlock = Block.make(other.namespace, { key: OtherBrushKey, ...other.contract })

const otherSubject = {
  block: OtherBrushBlock,
  layer: OtherBrushBlock.makeLayer(other.plans<typeof OtherBrushKey>(OtherBrushBlock)),
}

const plot = { children: [Area({ dataKey: 'value' })], animationDuration: 0 }

const owner = root.configuration({ enabled: true }, plot)

const observed = (kind: 'preview' | 'commit' | 'cancel', start: number, end: number) =>
  BrushBlock.Message.ObservedBrush({ kind, range: { start, end }, spanMs: 1000, innerWidth: 100 })

it('keeps fractional millisecond brush geometry until the padded public Date boundary', () => {
  const runtime = createChartRuntime<typeof Row.Type, Date, number>()

  const definition = buildTimeSeriesDefinition(data, {
    id: 'brush-fractional-range',
    x: (row) => row.date,
    children: [Area({ dataKey: 'value' })],
    margin: { left: 20, right: 20, top: 8, bottom: 8 },
  })

  const widths: Array<number> = []

  const visit = (nodes: ReadonlyArray<SceneNode>) => {
    for (const node of nodes) {
      if (node.kind === 'group') {
        visit(node.children)
      } else if (node.kind === 'rect' && node.className === 'selection') {
        widths.push(node.width)
        expect(node.style?.fill).toBe('transparent')
      }
    }
  }

  try {
    const scene = runtime.render(
      {
        ...definition,
        controls: [brushControl({ start: 0, end: (481 / 600) * 1000 }, () => {})],
      },
      { width: 640, height: 100 },
    )

    visit(scene.nodes)
    expect(widths).toHaveLength(1)
    expect(widths[0]).toBeCloseTo(481, 8)
  } finally {
    runtime.destroy()
  }
})

effectIt.effect(
  'reports the Source two-pixel padding while only commit accepts the raw native range',
  () =>
    Effect.gen(function* () {
      yield* Story.withBlock(subject, (block) => Effect.scoped(Layer.build(block.EffectsLayer)))
      yield* Story.withBlock(otherSubject, (block) =>
        Effect.scoped(Layer.build(block.EffectsLayer)),
      )
      yield* Story.story(
        subject,
        Story.init('brush', data, owner),
        Story.message(observed('preview', 200, 600)),
        Story.expectOutMessage(
          BrushBlock.OutMessage.SelectionObserved({
            kind: 'preview',
            report: Option.some({ start: 180, end: 620 }),
            viewport: Option.some({ start: 180, end: 620 }),
            enabled: true,
            slotCount: 2,
          }),
        ),
        Story.model((model) => {
          expect(model.control.accepted).toEqual(Option.none())
          expect(model.control.live).toEqual(Option.some({ start: 200, end: 600 }))
        }),
        Story.message(observed('commit', 200, 600)),
        Story.model((model) =>
          expect(model.control.accepted).toEqual(Option.some({ start: 200, end: 600 })),
        ),
        Story.message(observed('preview', 300, 700)),
        Story.message(observed('cancel', 200, 600)),
        Story.model((model) => {
          expect(model.control.live).toEqual(Option.none())
          expect(model.brushSelection).toEqual(Option.some({ start: 180, end: 620 }))
          expect(model.control.accepted).toEqual(Option.some({ start: 200, end: 600 }))
        }),
      )
    }),
)

effectIt.effect(
  'distinguishes subpixel null reporting from raw collapse and resets the main range to full extent',
  () =>
    Story.story(
      subject,
      Story.init('collapse', data, owner),
      Story.message(observed('commit', 300, 305)),
      Story.expectOutMessage(
        BrushBlock.OutMessage.SelectionObserved({
          kind: 'commit',
          report: Option.none(),
          viewport: Option.some({ start: 0, end: 1000 }),
          enabled: true,
          slotCount: 2,
        }),
      ),
      Story.model((model) => {
        expect(model.control.reported).toEqual(Option.some(Option.none()))
        expect(model.brushSelection).toEqual(Option.some({ start: 0, end: 1000 }))
        expect(shownRange(model.control, Option.some({ start: 0, end: 1000 }))).toEqual(
          Option.some({ start: 300, end: 305 }),
        )
      }),
      Story.message(observed('commit', 500, 500)),
      Story.model((model) => {
        expect(model.control.accepted).toEqual(Option.some({ start: 500, end: 500 }))
        expect(shownRange(model.control, Option.some({ start: 0, end: 1000 }))).toEqual(
          Option.some({ start: 0, end: 1000 }),
        )
      }),
    ),
)

effectIt.effect(
  'keeps the mount seed through preview cancel, applying the latest seed only on data identity reset',
  () => {
    const seeded = root.configuration({ enabled: true }, plot, {
      initialSelection: { start: date(100), end: date(900) },
    })
    const latest = root.configuration({ enabled: true }, plot, {
      initialSelection: { start: date(300), end: date(700) },
    })
    const fresh = [...data]
    return Story.story(
      subject,
      Story.init('seed', data, seeded),
      Story.message(observed('preview', 200, 600)),
      Story.message(observed('cancel', 0, 1000)),
      Story.model((model) =>
        expect(model.brushSelection).toEqual(Option.some({ start: 100, end: 900 })),
      ),
      Story.message(observed('preview', 200, 600)),
      Story.inMessage(BrushBlock.InMessage.RequestedConfigure({ owner: latest })),
      Story.model((model) =>
        expect(model.control.seed).toEqual(Option.some({ start: 100, end: 900 })),
      ),
      Story.models(
        Story.steps(Story.inMessage(BrushBlock.InMessage.RequestedData({ data }))),
        (before, after) => expect(after).toBe(before),
      ),
      Story.inMessage(BrushBlock.InMessage.RequestedData({ data: fresh })),
      Story.model((model) => {
        expect(model.data).toBe(fresh)
        expect(model.data[0]).toBe(data[0])
        expect(model.control.seed).toEqual(Option.some({ start: 300, end: 700 }))
        expect(model.brushSelection).toEqual(Option.some({ start: 0, end: 1000 }))
      }),
    )
  },
)

effectIt.effect(
  'retains logical selection while disabled and restores its accepted viewport when re-enabled',
  () =>
    Story.story(
      subject,
      Story.init('enabled', data, owner),
      Story.message(observed('commit', 200, 600)),
      Story.inMessage(
        BrushBlock.InMessage.RequestedConfigure({ owner: { ...owner, enabled: false } }),
      ),
      Story.model((model) =>
        expect(model.brushSelection).toEqual(Option.some({ start: 180, end: 620 })),
      ),
      Story.expectOutMessage(
        BrushBlock.OutMessage.ViewportChanged({
          viewport: Option.none(),
          enabled: false,
          slotCount: 2,
        }),
      ),
      Story.inMessage(BrushBlock.InMessage.RequestedConfigure({ owner })),
      Story.expectOutMessage(
        BrushBlock.OutMessage.ViewportChanged({
          viewport: Option.some({ start: 180, end: 620 }),
          enabled: true,
          slotCount: 2,
        }),
      ),
    ),
)

it('parses Source layout cells without UTC coercion, skips invalid cells and extends only the upper extent', () => {
  const rows = [
    { date: 'not-a-date' },
    { date: null },
    { date: date(100) },
    { date: 700 },
    { date: '1970-01-01T00:00:00.400Z' },
  ]

  expect(fullExtent(rows, { xDataKey: 'date', xExtentMax: Option.some(date(900)) })).toEqual(
    Option.some({ start: 100, end: 900 }),
  )
  expect(
    fullExtent([{ date: '2026-11-05T12:00:00' }], { xDataKey: 'date', xExtentMax: Option.none() }),
  ).toEqual(
    Option.some({
      start: Date.parse('2026-11-05T12:00:00'),
      end: Date.parse('2026-11-05T12:00:00'),
    }),
  )
  expect(
    fullExtent([{ date: 'invalid' }], { xDataKey: 'date', xExtentMax: Option.none() }),
  ).toEqual(Option.none())
  expect(Number.isNaN(brushDate(1e20).getTime())).toBe(true)
})

effectIt.effect(
  'roundtrips caller rows and the raw, live and reported selection through the real JSON codec',
  () =>
    Effect.gen(function* () {
      const active = yield* Story.story(
        subject,
        Story.init('codec', data, owner),
        Story.message(observed('commit', 200, 600)),
      )
      const codec = Schema.fromJsonString(Schema.toCodecJson(BrushBlock.Model))
      const decoded = yield* Schema.decodeUnknownEffect(codec)(
        yield* Schema.encodeEffect(codec)(active),
      )
      expect(decoded).toEqual(active)
      expect(decoded.data[0]?.date).toBeInstanceOf(Date)
      expect(decoded.data[0]?.label).toBe('First')
      expect(decoded.data).not.toBe(data)
      yield* Story.story(
        subject,
        Story.given(decoded),
        Story.message(observed('preview', 400, 800)),
        Story.model((model) =>
          expect(model.control.accepted).toEqual(Option.some({ start: 200, end: 600 })),
        ),
      )
    }),
)

effectIt.effect(
  'TimeClips fractional report padding toward zero without changing raw accepted bounds',
  () =>
    Story.story(
      subject,
      Story.init('fractional', data, owner),
      Story.message(
        BrushBlock.Message.ObservedBrush({
          kind: 'commit',
          range: { start: 200, end: 600 },
          spanMs: 1000,
          innerWidth: 600,
        }),
      ),
      Story.expectOutMessage(
        BrushBlock.OutMessage.SelectionObserved({
          kind: 'commit',
          report: Option.some({ start: 196, end: 603 }),
          viewport: Option.some({ start: 196, end: 603 }),
          enabled: true,
          slotCount: 2,
        }),
      ),
      Story.model((model) =>
        expect(model.control.accepted).toEqual(Option.some({ start: 200, end: 600 })),
      ),
      Story.message(
        BrushBlock.Message.ObservedBrush({
          kind: 'commit',
          range: { start: -600, end: -200 },
          spanMs: 1000,
          innerWidth: 600,
        }),
      ),
      Story.expectOutMessage(
        BrushBlock.OutMessage.SelectionObserved({
          kind: 'commit',
          report: Option.some({ start: -603, end: -196 }),
          viewport: Option.some({ start: -603, end: -196 }),
          enabled: true,
          slotCount: 2,
        }),
      ),
      Story.model((model) =>
        expect(model.control.accepted).toEqual(Option.some({ start: -600, end: -200 })),
      ),
      Story.message(observed('preview', 300, 700)),
      Story.message(observed('cancel', -600, -200)),
      Story.model((model) =>
        expect(model.brushSelection).toEqual(Option.some({ start: -603, end: -196 })),
      ),
    ),
)

effectIt.effect(
  'discards an unfinished strip preview on re-entry while retaining the separate layout viewport',
  () =>
    Story.story(
      subject,
      Story.init('remount-preview', data, owner),
      Story.message(observed('commit', 200, 600)),
      Story.message(observed('preview', 300, 700)),
      Story.inMessage(
        BrushBlock.InMessage.RequestedConfigure({ owner: { ...owner, enabled: false } }),
      ),
      Story.inMessage(BrushBlock.InMessage.RequestedConfigure({ owner })),
      Story.model((model) => {
        expect(model.control.accepted).toEqual(Option.none())
        expect(model.control.live).toEqual(Option.none())
        expect(model.control.reported).toEqual(Option.none())
        expect(model.control.seed).toEqual(Option.none())
        expect(model.brushSelection).toEqual(Option.some({ start: 280, end: 720 }))
      }),
      Story.expectOutMessage(
        BrushBlock.OutMessage.ViewportChanged({
          viewport: Option.some({ start: 280, end: 720 }),
          enabled: true,
          slotCount: 2,
        }),
      ),
    ),
)

effectIt.effect(
  'uses the latest initialSelection on strip re-entry and cancels back to that fresh seed',
  () => {
    const original = root.configuration({ enabled: true }, plot, {
      initialSelection: { start: date(100), end: date(900) },
    })
    const latest = root.configuration({ enabled: false }, plot, {
      initialSelection: { start: date(300), end: date(800) },
    })
    return Story.story(
      subject,
      Story.init('remount-seed', data, original),
      Story.message(observed('preview', 200, 600)),
      Story.inMessage(
        BrushBlock.InMessage.RequestedConfigure({ owner: { ...original, enabled: false } }),
      ),
      Story.inMessage(BrushBlock.InMessage.RequestedConfigure({ owner: latest })),
      Story.inMessage(
        BrushBlock.InMessage.RequestedConfigure({ owner: { ...latest, enabled: true } }),
      ),
      Story.model((model) => {
        expect(model.control.seed).toEqual(Option.some({ start: 300, end: 800 }))
        expect(model.control.accepted).toEqual(Option.none())
        expect(model.control.live).toEqual(Option.none())
        expect(model.control.reported).toEqual(Option.none())
        expect(model.brushSelection).toEqual(Option.some({ start: 180, end: 620 }))
      }),
      Story.message(observed('preview', 400, 700)),
      Story.message(observed('cancel', 300, 800)),
      Story.model((model) =>
        expect(model.brushSelection).toEqual(Option.some({ start: 300, end: 800 })),
      ),
      Story.expectOutMessage(
        BrushBlock.OutMessage.SelectionObserved({
          kind: 'cancel',
          report: Option.some({ start: 300, end: 800 }),
          viewport: Option.some({ start: 300, end: 800 }),
          enabled: true,
          slotCount: 2,
        }),
      ),
    )
  },
)

it('renders the outside-selection blur panes during a partial brush drag', () => {
  expect(() =>
    ChartBrushTrackOverlay(
      { innerWidth: 600, innerHeight: 84, selectionX0: 120, selectionX1: 400 },
      { mounted: true, margin: { top: 8, bottom: 8, left: 20, right: 20 } },
    ),
  ).not.toThrow()
})
