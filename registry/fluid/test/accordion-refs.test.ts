// @vitest-environment happy-dom -- caller Mounts must acquire through the real child boundary
import { it } from '@effect/vitest'
import { Effect, Schedule } from 'effect'
import { Program, Runtime } from 'foldkit'
import { expect } from 'vitest'
import {
  AccordionRefParentBlock,
  AccordionRefParentLayer,
} from '../../../tests/parity/accordion/src/refs-fixture.js'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('20 millis') }))

it.live('acquires caller item, trigger and content Mounts in their parent scope exactly once', () =>
  Effect.gen(function* callerAccordionMounts() {
    const host = document.createElement('div')
    const container = document.createElement('div')
    container.id = 'accordion-caller-mounts'
    host.append(container)
    document.body.append(host)

    const program = Runtime.embed(
      Program.make({ block: AccordionRefParentBlock, layer: AccordionRefParentLayer, container }),
    )

    try {
      const refs = () =>
        host.querySelector<HTMLElement>('[data-caller-ref-tags]')?.dataset.callerRefTags

      yield* eventually(() => {
        expect(refs()).toBe('["BUTTON","DIV","DIV"]')
      })

      const button = host.querySelector<HTMLButtonElement>('[data-accordion-trigger]')

      if (button === null) {
        throw new Error('Missing caller Accordion trigger')
      }

      button.click()
      yield* eventually(() => {
        expect(button.getAttribute('aria-expanded')).toBe('false')
      })
      expect(refs()).toBe('["BUTTON","DIV","DIV"]')
    } finally {
      yield* Effect.promise(program.dispose)
      host.remove()
    }
  }),
)
