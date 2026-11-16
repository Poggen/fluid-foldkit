import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Program, Runtime } from 'foldkit'
import { expect, vi } from 'vitest'
import { inputFileResourcesLayer } from '@foldkit-visuals/fluid/input'
import {
  FormDocsBlock,
  FormDocsLayer,
  Config,
  motion,
} from '../../../registry/fluid/examples/src/form-docs-block'

const waitFor = (assertion: () => void) => Effect.promise(() => vi.waitFor(assertion))

it.live(
  'delegated textarea frames retain real drafts while controls select panes and inspect independently',
  () =>
    Effect.gen(function* () {
      const container = document.createElement('div')
      container.id = 'delegated-form-preview'
      const host = document.createElement('div')
      host.append(container)
      document.body.append(host)
      const flags: typeof Config.Type = {
        family: 'textarea',
        embedded: true,
        shape: 'sharp',
        size: 'default',
      }
      const program = Runtime.embed(
        Program.makeElement({
          block: FormDocsBlock,
          layer: FormDocsLayer,
          container,
          Flags: Config,
          flags: Effect.succeed(flags),
        }).provide({ services: inputFileResourcesLayer, runtime: motion.layer }),
      )
      try {
        yield* waitFor(() => expect(host.querySelectorAll('.authored-frame')).toHaveLength(5))
        const frames = host.querySelectorAll('.authored-frame')
        const frame = frames[0]
        if (frame === undefined) throw new Error('Missing real textarea frame')
        const draft = frame.querySelector('textarea')
        const tabs = frame.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        const toggle = frame.querySelector<HTMLButtonElement>('[role="switch"]')
        if (draft === null || toggle === null) throw new Error('Missing documentation controls')
        expect(host.querySelectorAll('.reference-toolbar [role="switch"]')).toHaveLength(5)
        draft.value = 'A retained authored draft'
        draft.dispatchEvent(new Event('input', { bubbles: true }))
        yield* waitFor(() => expect(draft.value).toBe('A retained authored draft'))
        tabs[1]?.click()
        yield* waitFor(() => expect(tabs[1]?.getAttribute('aria-selected')).toBe('true'))
        const codePanel = document.getElementById(tabs[1]?.getAttribute('aria-controls') ?? '')
        expect(codePanel?.classList.contains('hidden')).toBe(false)
        expect(codePanel?.textContent).toContain('FormDocsComposition')
        tabs[0]?.click()
        yield* waitFor(() => expect(tabs[0]?.getAttribute('aria-selected')).toBe('true'))
        expect(frame.querySelector('textarea')).toBe(draft)
        expect(draft.value).toBe('A retained authored draft')
        toggle.click()
        yield* waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'))
        expect(frames[1]?.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe(
          'false',
        )
        draft.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
        yield* waitFor(() =>
          expect(frame.querySelector('[role="status"]')?.textContent).toContain('textarea'),
        )
        expect(frames[1]?.querySelector('[role="status"]')).toBeNull()
        toggle.click()
        yield* waitFor(() => expect(frame.querySelector('[role="status"]')).toBeNull())
      } finally {
        yield* Effect.promise(() => program.dispose())
        host.remove()
      }
    }),
)
