// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- real checked Block tree and native form controls
import { makeInputFileResourcesLayer } from '../src/input.js'
import { createInputMessageFileRegistry } from '../src/input-message-file-registry.js'
import { it } from '@effect/vitest'
import { Effect, Schedule } from 'effect'
import { Program, Runtime } from 'foldkit'
import { expect } from 'vitest'
import {
  FormsExampleBlock,
  FormsExampleLayer,
  target,
} from '../examples/src/forms-example-block.js'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('20 millis') }))

it.live(
  'links own field messages, steps native numbers without stealing focus, and separates checkbox card Enter from form submit',
  () =>
    Effect.gen(function* verifiesNativeForms() {
      const host = document.createElement('div')
      const container = document.createElement('div')
      container.id = 'forms-dom-host'
      host.append(container)
      document.body.append(host)
      const registry = createInputMessageFileRegistry()

      const program = Runtime.embed(
        Program.makeElement({
          block: FormsExampleBlock,
          layer: FormsExampleLayer,
          container,
        }).provide({ services: makeInputFileResourcesLayer(registry), runtime: target.layer }),
      )

      try {
        yield* eventually(() => {
          expect(host.querySelector('#form-name')?.getAttribute('aria-describedby')).toBe(
            'name-field-message-0',
          )
        })
        const name = host.querySelector<HTMLInputElement>('#form-name')
        const field = host.querySelector<HTMLElement>('#name-field')

        if (!name || !field) {
          throw new Error('Expected name field')
        }

        name.setAttribute(
          'aria-describedby',
          `${name.getAttribute('aria-describedby')} caller-description`,
        )
        const error = document.createElement('div')
        error.dataset.slot = 'field-error'
        error.textContent = 'Try another name'
        field.append(error)
        const nested = document.createElement('div')
        nested.dataset.slot = 'field'
        const nestedDescription = document.createElement('p')
        nestedDescription.dataset.slot = 'field-description'
        nestedDescription.id = 'nested-description'
        nested.append(nestedDescription)
        field.append(nested)
        yield* eventually(() => {
          expect(error.id).not.toBe('')
          expect(name.getAttribute('aria-describedby')?.split(' ')).toEqual([
            'caller-description',
            'name-field-message-0',
            error.id,
          ])
          expect(name.getAttribute('aria-describedby')).not.toContain('nested-description')
        })
        error.remove()
        yield* eventually(() => {
          expect(name.getAttribute('aria-describedby')?.split(' ')).toEqual([
            'caller-description',
            'name-field-message-0',
          ])
        })
        const input = host.querySelector<HTMLInputElement>('#form-amount')
        const choice = host.querySelector<HTMLElement>('#form-choice')
        const plain = host.querySelector<HTMLElement>('#form-plain')

        const upload = host.querySelector<HTMLInputElement>('#form-upload')

        if (!upload) {
          throw new Error('Expected native file input')
        }

        const selected = new File(['hello'], 'greeting.txt', {
          type: 'text/plain',
          lastModified: 42,
        })

        const transfer = new DataTransfer()
        transfer.items.add(selected)
        upload.files = transfer.files
        upload.dispatchEvent(new Event('change', { bubbles: true }))
        const identity = 'greeting.txt-5-42'
        yield* eventually(() => {
          expect(registry.file(identity)).toBe(selected)
        })
        upload.dispatchEvent(new Event('cancel'))
        expect(registry.file(identity)).toBe(selected)

        const form = host.querySelector('form')

        if (!input || !choice || !plain || !form) {
          throw new Error('Expected authored form controls')
        }

        input.focus()
        const increase = host.querySelector<HTMLButtonElement>('[aria-label=Increase]')

        if (!increase) {
          throw new Error('Expected number increment')
        }

        expect(increase.tabIndex).toBe(-1)
        increase.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
        increase.click()
        yield* eventually(() => {
          expect(input.value).toBe('3')
        })
        expect(document.activeElement).toBe(input)
        input.max = '3'
        increase.click()
        yield* eventually(() => {
          expect(input.value).toBe('3')
        })
        input.step = '0.5'
        const decrease = host.querySelector<HTMLButtonElement>('[aria-label=Decrease]')

        if (!decrease) {
          throw new Error('Expected number decrement')
        }

        decrease.click()
        yield* eventually(() => {
          expect(input.value).toBe('2.5')
        })
        choice.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
        )
        yield* eventually(() => {
          expect(choice.getAttribute('aria-checked')).toBe('false')
        })
        expect(plain.getAttribute('aria-checked')).toBe('false')
        plain.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
        )
        yield* eventually(() => {
          expect(plain.getAttribute('aria-checked')).toBe('false')
        })
        plain.click()
        yield* eventually(() => {
          expect(plain.getAttribute('aria-checked')).toBe('true')
        })
        expect(new FormData(form).get('terms')).toBe('on')
        form.reset()
        yield* eventually(() => {
          expect(() => registry.file(identity)).toThrow()
        })
        yield* eventually(() => {
          expect(plain.getAttribute('aria-checked')).toBe('false')
        })
        yield* eventually(() => {
          expect(choice.getAttribute('aria-checked')).toBe('true')
        })
        expect(host.querySelectorAll('[role=alert] li')).toHaveLength(0)
        expect(host.querySelector('[role=alert]')?.textContent).toBe(
          'Please review the required fields.',
        )
      } finally {
        yield* Effect.promise(program.dispose)
        registry.dispose()
        host.remove()
      }
    }),
)
