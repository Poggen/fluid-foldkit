// @vitest-environment happy-dom -- Exercise the real keyboard event cancellation boundary.
import { dropdownPanelKeys } from '../src/dropdown-panel-keys.js'
import type { DropdownPanelObservation } from '../src/dropdown-observation.js'
import { DropdownEvent } from '../src/dropdown.js'
import { describe, expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Layer, Option } from 'effect'
import { Story } from 'foldkit'
import { FinishExit } from '../src/dropdown-composition.js'
import { DropdownMenuBlock as block, menuLayer as layer } from '../src/dropdown.js'
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'

const subject = { block, layer: layer.pipe(Layer.provide(DropdownResourcesServerLayer)) }

describe('native Dropdown domain admission', () => {
  test.effect('accepts uncontrolled opening and closing through native operations', () =>
    Story.story(
      subject,
      Story.init({ id: 'native-menu' }),
      Story.inMessage(block.InMessage.RequestedVisibility({ open: true })),
      Story.model((m) => {
        expect(m.controller.phase).toBe('open')
      }),
      Story.expectOutMessage(
        block.OutMessage.Events({ events: [DropdownEvent.cases.OpenChanged.make({ open: true })] }),
      ),
      Story.inMessage(block.InMessage.RequestedVisibility({ open: false })),
      Story.model((m) => {
        expect(m.controller.phase).toBe('closing')
      }),
      Story.expectOutMessage(
        block.OutMessage.Events({
          events: [DropdownEvent.cases.OpenChanged.make({ open: false })],
        }),
      ),
      Story.Command.expectExact(FinishExit({ generation: 2 })),
      Story.Command.resolve(FinishExit, block.Message.CompletedExit({ generation: 2 })),
      Story.Command.expectNone(),
    ),
  )
  test.effect(
    'reports a controlled request without opening until the owner accepts its value',
    () =>
      Story.story(
        subject,
        Story.init({ id: 'controlled-menu', open: false }),
        Story.inMessage(block.InMessage.RequestedVisibility({ open: true })),
        Story.model((m) => {
          expect(m.controller.phase).toBe('absent')
        }),
        Story.expectOutMessage(
          block.OutMessage.Events({
            events: [DropdownEvent.cases.OpenChanged.make({ open: true })],
          }),
        ),
        Story.inMessage(block.InMessage.RequestedControlledOpen({ control: Option.some(true) })),
        Story.model((m) => {
          expect(m.controller.phase).toBe('open')
        }),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
      ),
  )
  test.effect('does not report or acquire opening while disabled', () =>
    Story.story(
      subject,
      Story.init({ id: 'disabled-menu', disabled: true }),
      Story.inMessage(block.InMessage.RequestedVisibility({ open: true })),
      Story.model((m) => {
        expect(m.controller.phase).toBe('absent')
      }),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    ),
  )
  test.effect('initial opening is synchronous and a later authoritative close wins', () =>
    Story.story(
      subject,
      Story.init({ id: 'initial-menu', defaultOpen: true }),
      Story.model((m) => {
        expect(m.controller.phase).toBe('open')
      }),
      Story.Command.expectNone(),
      Story.inMessage(block.InMessage.RequestedControlledOpen({ control: Option.some(false) })),
      Story.model((m) => {
        expect(m.controller.phase).toBe('closing')
      }),
      Story.expectNoOutMessage(),
      Story.Command.expectExact(FinishExit({ generation: 1 })),
      Story.Command.resolve(FinishExit, block.Message.CompletedExit({ generation: 1 })),
      Story.Command.expectNone(),
    ),
  )
})

describe.each(['Enter', ' '])('Base Dropdown keyboard activation: %s', (key) => {
  test.each([false, true])('allows the consumer activation veto: %s', (veto) => {
    const panel = document.createElement('div')
    const row = document.createElement('div')
    panel.append(row)
    const observedCancellation: Array<boolean> = []
    const observations: Array<DropdownPanelObservation> = []

    const handler = dropdownPanelKeys({
      element: panel,
      inline: false,
      owned: (target) => target === row,
      search: () => [...panel.querySelectorAll<HTMLInputElement>('input')].at(-1),
      rows: () => [row],
      rowFor: (target) => (target === row ? row : null),
      generation: () => 0,
      send: (observation) => {
        observations.push(observation)
      },
      changeSearch: () => {
        throw new Error('Activation must not change search')
      },
      activate: (activated, event) => {
        expect(activated).toBe(row)
        observedCancellation.push(event.defaultPrevented)

        if (veto) {
          event.preventDefault()
        }
      },
    })

    panel.addEventListener('keydown', handler)
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

    try {
      row.dispatchEvent(event)
      expect(observedCancellation).toEqual([false])
      expect(event.defaultPrevented).toBe(true)
      expect(observations).toEqual([])
    } finally {
      panel.removeEventListener('keydown', handler)
    }
  })
})
