import { expect, test } from 'vitest'
import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { Effect, Schema } from 'effect'
import {
  SelectionBackgroundsBlock,
  layer,
  test as selectionTest,
} from '../src/selection-backgrounds.js'
import { SelectionRun, SelectionBoundary, SelectionRowIndex } from '../src/selection-state.js'

test('source row-index codecs preserve legacy finite JSON and all numeric source values', () => {
  const values = [0, -1, 0.5, Infinity, -Infinity, Number.NaN]

  const codec = Schema.fromJsonString(Schema.Array(SelectionRowIndex))
  expect(Schema.encodeSync(codec)(values)).toBe('[0,-1,0.5,"Infinity","-Infinity","NaN"]')
  expect(Schema.decodeSync(codec)(Schema.encodeSync(codec)(values))).toEqual(values)

  const run = { start: -1, end: 0, id: 1 }

  const runCodec = Schema.fromJsonString(SelectionRun)
  expect(Schema.decodeSync(runCodec)(Schema.encodeSync(runCodec)(run))).toEqual(run)

  const boundary = {
    tid: 1,
    kind: 'split',
    survivorId: 1,
    otherId: 2,
    gapIndex: 0.5,
    phase: 'diverge',
  } satisfies typeof SelectionBoundary.Type

  const boundaryCodec = Schema.fromJsonString(SelectionBoundary)
  expect(Schema.decodeSync(boundaryCodec)(Schema.encodeSync(boundaryCodec)(boundary))).toEqual(
    boundary,
  )
})

const subject = { block: SelectionBackgroundsBlock, layer }

it.effect(
  'source negative and fractional runs retain their grouping without inventing row geometry',
  () =>
    Effect.gen(function* preservesSelectionGeometry() {
      const changed = yield* Story.story(
        subject,
        Story.init({
          id: 'odd-runs',
          itemRects: [
            { top: 0, left: 0, width: 100, height: 36 },
            { top: 36, left: 0, width: 100, height: 36 },
          ],
          radius: 8,
        }),
        Story.inMessage(
          SelectionBackgroundsBlock.InMessage.RequestedSelection({ indices: [-1, 0, 0.5, 1.5] }),
        ),
        Story.model((model) => {
          expect(model.runs.map(({ start, end }) => ({ start, end }))).toEqual([
            { start: -1, end: 0 },
            { start: 0.5, end: 1.5 },
          ])
          expect(model.slots).toEqual([])
        }),
        Story.Command.expectExact(selectionTest.SynchronizeClock),
        Story.Command.resolve(
          selectionTest.SynchronizeClock,
          SelectionBackgroundsBlock.Message.CompletedClock(),
        ),
        Story.Command.expectNone(),
      )
      const codec = Schema.fromJsonString(SelectionBackgroundsBlock.Model)
      expect(yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(changed))).toEqual(
        changed,
      )
    }),
)

it.effect('normal consumers still render one selected rectangle for a contiguous run', () =>
  Story.story(
    subject,
    Story.init({
      id: 'normal-run',
      radius: 8,
      itemRects: [
        { top: 4, left: 4, width: 200, height: 36 },
        { top: 40, left: 4, width: 200, height: 36 },
      ],
    }),
    Story.inMessage(SelectionBackgroundsBlock.InMessage.RequestedSelection({ indices: [0, 1] })),
    Story.model((model) => {
      expect(model.slots).toHaveLength(1)
      expect(model.slots[0]?.shape).toMatchObject({
        top: 4,
        left: 4,
        width: 200,
        height: 72,
        radii: [8, 8, 8, 8],
      })
    }),
    Story.Command.expectExact(selectionTest.SynchronizeClock),
    Story.Command.resolve(
      selectionTest.SynchronizeClock,
      SelectionBackgroundsBlock.Message.CompletedClock(),
    ),
    Story.Command.expectNone(),
  ),
)
