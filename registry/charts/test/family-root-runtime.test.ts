// @vitest-environment happy-dom
import { Effect, Schedule } from 'effect'
import { Program, Runtime } from 'foldkit'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { familyRootFixture } from './fixtures/family-root'
import { fontTestEnvironment } from './font-test-environment'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('20 millis') }))

for (const lowLevel of [false, true]) {
  it.live(
    lowLevel
      ? 'retained definition accepts size and ARIA changes without compiling again'
      : 'checked family root owns caller presentation and retains its drawing and siblings',
    () =>
      Effect.scoped(
        Effect.gen(function* () {
          const environment = yield* Effect.acquireRelease(
            Effect.sync(fontTestEnvironment),
            (value) => Effect.sync(value.destroy),
          )
          const wait = (assertion: () => void) =>
            eventually(() => {
              environment.flush()
              assertion()
            })
          const fixture = familyRootFixture(
            lowLevel ? 'root-options-regression' : 'family-root-regression',
            lowLevel,
          )
          const container = environment.container
          const mount = document.createElement('div')
          mount.id = lowLevel ? 'root-options-runtime' : 'family-root-runtime'
          container.append(mount)
          yield* Effect.acquireRelease(
            Effect.sync(() =>
              Runtime.embed(
                Program.makeElement({
                  block: fixture.block,
                  layer: fixture.layer,
                  container: mount,
                  devTools: false,
                }),
              ),
            ),
            (runtime) => Effect.promise(runtime.dispose),
          )
          const select = (name: string) => {
            const button = container.querySelector<HTMLButtonElement>(`[data-case="${name}"]`)
            if (button === null) throw new Error(`Missing actual control ${name}`)
            button.click()
          }
          yield* wait(() =>
            expect(container.querySelector('svg.ts-chart'), container.innerHTML).not.toBeNull(),
          )
          const root = container.querySelector<HTMLDivElement>('[data-bkm-native-chart]')
          const svg = container.querySelector('svg.ts-chart')
          if (root === null || svg === null) throw new Error('Missing acquired chart')
          const owner = svg.closest('.ts-chart-host')?.parentElement
          const beforeCompiles = fixture.compiles
          const state = container
            .querySelector('[data-fixture-state]')
            ?.textContent?.split(';')
            .slice(1)
          select('conflict')
          yield* wait(() =>
            expect(container.querySelector('[data-fixture-state]')?.textContent).toContain(
              'conflict;',
            ),
          )
          expect(container.querySelector('svg.ts-chart')).toBe(svg)
          expect(svg.closest('.ts-chart-host')?.parentElement).toBe(owner)
          expect(
            container.querySelector('[data-fixture-state]')?.textContent?.split(';').slice(1),
          ).toEqual(state)
          if (lowLevel) {
            yield* wait(() => {
              expect(svg.getAttribute('viewBox')).toBe('0 0 480 240')
              expect(svg.getAttribute('aria-label')).toBe('Changed chart')
            })
            expect(fixture.compiles).toBe(beforeCompiles)
          } else {
            expect(fixture.observed).toBe(root)
            expect(root.className).toContain('static')
            expect(root.className).toContain('w-1/2')
            expect(root.classList.contains('relative')).toBe(false)
            expect(root.classList.contains('w-full')).toBe(false)
            expect(root.style.width).toBe('480px')
            expect(root.style.height).toBe('240px')
            expect(root.style.getPropertyValue('--root-ink')).toBe('rgb(1, 2, 3)')
            expect(root.querySelector('[data-root-context]')).not.toBeNull()
            expect(root.querySelectorAll('.root-caller')).toHaveLength(0)
            select('paint')
            yield* wait(() => expect(root.style.backgroundColor).toBe('rgb(240, 245, 250)'))
            expect(container.querySelector('svg.ts-chart')).toBe(svg)
          }
          select('restored')
          yield* wait(() => expect(root.style.backgroundColor).toBe(''))
          if (lowLevel) {
            yield* wait(() => expect(svg.getAttribute('viewBox')).toBe('0 0 640 320'))
            expect(fixture.compiles).toBe(beforeCompiles)
          } else {
            yield* wait(() => expect(root.style.width).toBe('640px'))
            expect(root.style.getPropertyValue('--root-ink')).toBe('')
            expect(root.style.height).toBe('320px')
            expect(fixture.observed).toBe(root)
          }
        }),
      ),
  )
}
