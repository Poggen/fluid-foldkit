import { Option } from 'effect'
import { it } from '@effect/vitest'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { TableBlock as Table, layer, test } from '../src/table.js'
import {
  SelectionBackgroundsBlock as Selection,
  test as selectionTest,
} from '../src/selection-backgrounds.js'
import { HoverBlock as Hover, test as hoverTest } from '../src/hover.js'

const subject = { block: Table, layer }
const configure = { selectedIndices: [0, 1, 1], heldHeadIndex: 1, hideHeadHighlight: false }

it.effect('table normalizes controlled selection and retains held header policy', () =>
  Story.story(
    subject,
    Story.init({ id: 'table' }),
    Story.inMessage(Table.InMessage.RequestedConfigure(configure)),
    Story.model((model) => {
      expect(model.selectedIndices).toEqual([0, 1])
      expect(model.selection.runs.map((run) => [run.start, run.end])).toEqual([[0, 1]])
      expect(Option.getOrNull(model.heldHeadIndex)).toBe(1)
      expect(model.snapRules).toBe(true)
    }),
    Story.Command.resolveAllExact(
      [selectionTest.SynchronizeClock, Selection.Message.CompletedClock()],
      [test.CompleteFrames, Table.Message.CompletedRules({ generation: 1 })],
    ),
    Story.model((model) => expect(model.snapRules).toBe(false)),
  ),
)

it.effect(
  'keyboard ownership survives stationary scroll events and yields to actual movement',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'keyboard' }),
      Story.message(Table.Message.CapturedPointer({ x: 40, y: 80, index: 0, entered: true })),
      Story.inMessage(Table.InMessage.RequestedHighlight({ index: 2 })),
      Story.message(Table.Message.CapturedPointer({ x: 40, y: 80, index: 1, entered: false })),
      Story.model((model) => {
        expect(model.hover.activeIndex).toBe(2)
        expect(model.keyboardOwns).toBe(true)
      }),
      Story.message(Table.Message.CapturedPointer({ x: 40, y: 81, index: 1, entered: false })),
      Story.model((model) => {
        expect(model.hover.activeIndex).toBe(1)
        expect(model.keyboardOwns).toBe(false)
      }),
      Story.message(Table.Message.CapturedRepeat({ repeating: true })),
      Story.message(Table.Message.CapturedBlur({ pointerInside: true })),
      Story.model((model) => {
        expect(model.hover.activeIndex).toBe(1)
        expect(model.repeating).toBe(false)
      }),
      Story.message(Table.Message.CapturedBlur({ pointerInside: false })),
      Story.model((model) => expect(model.hover.activeIndex).toBeNull()),
    ),
)

it.effect(
  'setting and removing snap identity advance generations and stale completions cannot release them',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'snap-table' }),
      Story.inMessage(
        Table.InMessage.RequestedConfigure({
          selectedIndices: [],
          heldHeadIndex: null,
          hideHeadHighlight: false,
          snapKey: 'revision',
        }),
      ),
      Story.Command.resolveAllExact(
        [selectionTest.SynchronizeClock, Selection.Message.CompletedClock()],
        [hoverTest.ControlHover, Hover.Message.CompletedControl()],
        [hoverTest.ControlHover, Hover.Message.CompletedControl()],
        [test.CompleteFrames, Table.Message.CompletedSnap({ generation: 1 })],
      ),
      Story.inMessage(
        Table.InMessage.RequestedConfigure({
          selectedIndices: [],
          heldHeadIndex: null,
          hideHeadHighlight: false,
        }),
      ),
      Story.message(Table.Message.CompletedSnap({ generation: 1 })),
      Story.model((model) => {
        expect(model.snapGeneration).toBe(2)
        expect(model.snapping).toBe(true)
      }),
      Story.Command.resolveAllExact(
        [selectionTest.SynchronizeClock, Selection.Message.CompletedClock()],
        [hoverTest.ControlHover, Hover.Message.CompletedControl()],
        [hoverTest.ControlHover, Hover.Message.CompletedControl()],
        [test.CompleteFrames, Table.Message.CompletedSnap({ generation: 2 })],
      ),
      Story.model((model) => expect(model.snapping).toBe(false)),
    ),
)
