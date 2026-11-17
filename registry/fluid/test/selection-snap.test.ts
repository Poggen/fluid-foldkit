import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import {
  SelectionBackgroundsBlock as Selection,
  layer,
  test,
} from '../src/selection-backgrounds.js'
import { geometryFromEntries, emptyGeometry } from '../src/lib/indexed-geometry.js'

const subject = { block: Selection, layer }
const geometry = geometryFromEntries(
  [0, 1, 2].map((index) => ({ index, rect: { top: index * 40, left: 0, width: 200, height: 40 } })),
)
const clock = Story.Command.resolveAllExact([
  test.SynchronizeClock,
  Selection.Message.CompletedClock(),
])

it.effect('snap owns placeholder runs before the DOM supplies new row geometry', () =>
  Story.story(
    subject,
    Story.init({ id: 'snap', indices: [0], itemRects: geometry, radius: 8 }),
    Story.inMessage(
      Selection.InMessage.RequestedSnap({ indices: [8, 9], itemRects: geometry, radius: 8 }),
    ),
    clock,
    Story.model((model) => {
      expect(model.runs.map((run) => [run.start, run.end])).toEqual([[8, 9]])
      expect(model.slots).toHaveLength(1)
      expect(model.slots[0]?.shape.height).toBe(0)
      expect(model.snapPending).toBe(true)
      expect(model.boundaries).toEqual([])
    }),
    Story.inMessage(
      Selection.InMessage.RequestedSnap({ indices: [], itemRects: emptyGeometry, radius: 8 }),
    ),
    clock,
    Story.model((model) => {
      expect(model.slots).toEqual([])
      expect(model.snapPending).toBe(false)
    }),
  ),
)

it.effect('a superseding snap rejects stale measured geometry and completion', () =>
  Story.story(
    subject,
    Story.init({ id: 'superseded' }),
    Story.inMessage(
      Selection.InMessage.RequestedSnap({ indices: [0], itemRects: geometry, radius: 8 }),
    ),
    clock,
    Story.inMessage(
      Selection.InMessage.RequestedSnap({ indices: [2], itemRects: geometry, radius: 8 }),
    ),
    clock,
    Story.message(Selection.Message.CapturedSnap({ generation: 1, itemRects: emptyGeometry })),
    Story.message(Selection.Message.CompletedSnap({ generation: 1 })),
    Story.model((model) => {
      expect(model.snapGeneration).toBe(2)
      expect(model.snapPending).toBe(true)
      expect(model.snapMeasured).toBe(false)
      expect(model.slots[0]?.shape.top).toBe(80)
    }),
    Story.message(Selection.Message.CapturedSnap({ generation: 2, itemRects: geometry })),
    Story.Command.resolveAllExact([
      test.CompleteSnap,
      Selection.Message.CompletedSnap({ generation: 2 }),
    ]),
    Story.model((model) => expect(model.snapPending).toBe(false)),
  ),
)
