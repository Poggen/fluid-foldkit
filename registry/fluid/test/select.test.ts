import { describe, expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Layer, Option } from 'effect'
import { Story } from 'foldkit'
import { HoverBlock, test as hoverTest } from '../src/hover.js'
import { SelectBlock, layer } from '../src/select.js'
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'
import { FinishExit } from '../src/dropdown-composition.js'
import { Message as DropdownMessage } from '../src/dropdown-composition.js'

describe('Select', () => {
  const subject = {
    block: SelectBlock,
    layer: layer.pipe(Layer.provide(DropdownResourcesServerLayer)),
  }
  test.effect('keeps the accepted choice available for focus after closing and reopening', () =>
    Story.story(
      subject,
      Story.init({
        id: 'fruit',
        defaultValue: 'cherry',
        items: [
          { value: 'apple', label: 'Apple' },
          { value: 'cherry', label: 'Cherry' },
        ],
      }),
      Story.inMessage(SelectBlock.InMessage.RequestedOpen()),
      Story.inMessage(SelectBlock.InMessage.RequestedClose()),
      Story.expectOutMessage(SelectBlock.OutMessage.OpenChanged({ open: false })),
      Story.model((model) => {
        expect(model.value).toBe('cherry')
        expect(model.menu.controller.checkedIndex).toEqual(Option.some(1))
      }),
      Story.Command.expectExact(FinishExit),
      Story.Command.resolve(FinishExit, DropdownMessage.CompletedExit({ generation: 2 })),
      Story.inMessage(SelectBlock.InMessage.RequestedOpen()),
      Story.expectOutMessage(SelectBlock.OutMessage.OpenChanged({ open: true })),
      Story.model((model) => {
        expect(model.value).toBe('cherry')
        expect(model.menu.controller.checkedIndex).toEqual(Option.some(1))
      }),
      Story.Command.expectNone(),
    ),
  )
})

test.effect(
  'controlled selection waits for the parent acknowledgement and native reset preserves it',
  () =>
    Story.story(
      {
        block: SelectBlock,
        layer: layer.pipe(Layer.provide(DropdownResourcesServerLayer)),
      },
      Story.init({
        id: 'controlled-fruit',
        value: 'apple',
        defaultValue: 'apple',
        items: [
          { value: 'apple', label: 'Apple' },
          { value: 'cherry', label: 'Cherry' },
        ],
      }),
      Story.message(SelectBlock.Message.NativeSelected({ value: 'cherry' })),
      Story.expectOutMessage(SelectBlock.OutMessage.Selected({ value: 'cherry' })),
      Story.model((model) => {
        expect(model.value).toBe('apple')
        expect(model.menu.controller.checkedIndex).toEqual(Option.some(0))
      }),
      Story.inMessage(
        SelectBlock.InMessage.RequestedConfigure({
          items: [
            { value: 'apple', label: 'Apple' },
            { value: 'cherry', label: 'Cherry' },
          ],
          value: 'cherry',
        }),
      ),
      Story.message(SelectBlock.Message.FormReset()),
      Story.model((model) => {
        expect(model.value).toBe('cherry')
        expect(model.menu.controller.checkedIndex).toEqual(Option.some(1))
      }),
      Story.Command.resolveAll(
        [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
        [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
        [hoverTest.ControlHover, HoverBlock.Message.CompletedControl()],
      ),
      Story.Command.expectNone(),
    ),
)
