import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import {
  SelectionBackgroundsBlock as Selection,
  layer,
  test,
} from '../src/selection-backgrounds.js'
import { convergeMs, splitMs } from '../src/lib/selection-geometry.js'
import type { SelectionClockPlan } from '../src/selection-clock.js'

const subject = { block: Selection, layer }
const itemRects = [0, 1, 2].map((index) => ({ top: index * 24, left: 0, width: 100, height: 24 }))
const init = { id: 'selection-requests', itemRects, radius: 8 }
const settle = (plan: SelectionClockPlan) =>
  Story.steps(
    Story.Command.expectExactInOrder(test.SynchronizeClock({ id: init.id, plan })),
    Story.Command.resolveAllExact([test.SynchronizeClock, Selection.Message.CompletedClock()]),
  )
const emptyPlan = { deadlines: [], nextFrame: [] }

it.effect('empty selection requests retain state and require no clock work', () =>
  Story.story(
    subject,
    Story.init(init),
    Story.models(
      Story.steps(
        Story.inMessage(Selection.InMessage.RequestedSelection({ indices: [] })),
        Story.inMessage(Selection.InMessage.RequestedRuns({ runs: [] })),
      ),
      (before, after) => expect(after).toBe(before),
    ),
    Story.Command.expectNone(),
    Story.expectNoOutMessage(),
  ),
)

it.effect(
  'equivalent selected rows preserve rendered slots but changed geometry still retargets',
  () =>
    Story.story(
      subject,
      Story.init({ ...init, indices: [0, 1] }),
      Story.models(
        Story.steps(
          Story.inMessage(Selection.InMessage.RequestedSelection({ indices: [1, 0] })),
          Story.inMessage(
            Selection.InMessage.RequestedRuns({ runs: [{ start: 0, end: 1, id: 1 }] }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.inMessage(
        Selection.InMessage.InformedOfGeometry({
          itemRects: itemRects.map((rect) => ({ ...rect, width: 160 })),
          radius: 12,
        }),
      ),
      Story.model((model) => {
        expect(model.slots.filter((slot) => slot.present).map((slot) => slot.shape.width)).toEqual([
          160,
        ])
        expect(model.radius).toBe(12)
      }),
      Story.Command.expectNone(),
      Story.expectNoOutMessage(),
    ),
)

it.effect('repeated merge and split targets preserve phase deadlines and still finish', () =>
  Story.story(
    subject,
    Story.init({ ...init, indices: [0, 2] }),
    Story.inMessage(Selection.InMessage.RequestedSelection({ indices: [0, 1, 2] })),
    settle({ deadlines: [{ id: 1, delay: convergeMs }], nextFrame: [] }),
    Story.models(
      Story.steps(Story.inMessage(Selection.InMessage.RequestedSelection({ indices: [2, 1, 0] }))),
      (before, after) => {
        expect(after).toBe(before)
        expect(after.boundaries[0]?.phase).toBe('converge')
      },
    ),
    Story.Command.expectNone(),
    Story.message(Selection.Message.ResolvedBoundary({ id: 1 })),
    settle({ deadlines: [], nextFrame: [1] }),
    Story.message(Selection.Message.AdvancedFrame({ ids: [1] })),
    settle(emptyPlan),
    Story.model((model) => expect(model.boundaries).toEqual([])),
    Story.inMessage(Selection.InMessage.RequestedSelection({ indices: [0, 2] })),
    settle({ deadlines: [{ id: 2, delay: splitMs }], nextFrame: [2] }),
    Story.models(
      Story.steps(Story.inMessage(Selection.InMessage.RequestedSelection({ indices: [0, 2] }))),
      (before, after) => {
        expect(after).toBe(before)
        expect(after.boundaries[0]?.phase).toBe('splitIn')
      },
    ),
    Story.Command.expectNone(),
    Story.message(Selection.Message.AdvancedFrame({ ids: [2] })),
    settle({ deadlines: [{ id: 2, delay: splitMs }], nextFrame: [] }),
    Story.message(Selection.Message.ResolvedBoundary({ id: 2 })),
    settle(emptyPlan),
    Story.model((model) => {
      expect(model.boundaries).toEqual([])
      expect(model.runs.map((run) => [run.start, run.end])).toEqual([
        [0, 0],
        [2, 2],
      ])
    }),
    Story.expectNoOutMessage(),
  ),
)

it.effect('a changed target interrupts an active merge and cancels its clock plan', () =>
  Story.story(
    subject,
    Story.init({ ...init, indices: [0, 2] }),
    Story.inMessage(Selection.InMessage.RequestedSelection({ indices: [0, 1, 2] })),
    settle({ deadlines: [{ id: 1, delay: convergeMs }], nextFrame: [] }),
    Story.inMessage(Selection.InMessage.RequestedSelection({ indices: [] })),
    settle(emptyPlan),
    Story.model((model) => {
      expect(model.boundaries).toEqual([])
      expect(model.runs).toEqual([])
      expect(model.slots.every((slot) => !slot.present)).toBe(true)
    }),
    Story.models(
      Story.steps(Story.inMessage(Selection.InMessage.RequestedSelection({ indices: [] }))),
      (before, after) => expect(after).toBe(before),
    ),
    Story.Command.expectNone(),
    Story.expectNoOutMessage(),
  ),
)
