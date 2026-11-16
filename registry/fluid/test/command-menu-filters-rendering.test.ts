import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { Window } from 'happy-dom'
import { expect } from 'vitest'
import {
  CommandFiltersExampleBlock,
  commandFiltersLayer,
  Options,
} from '../examples/src/command-menu-filters-contract.js'

for (const compact of [false, true]) {
  for (const trailing of [false, true]) {
    it.effect(
      `filters use compact descendants within ${compact ? 'compact' : 'default'} ${trailing ? 'trailing' : 'standalone'} presentation`,
      () =>
        Effect.gen(function* () {
          const { html } = yield* renderToString(
            { block: CommandFiltersExampleBlock, layer: commandFiltersLayer },
            { Flags: Options },
            { flags: { compact, trailing }, isHydratable: false },
          )
          const window = new Window()
          try {
            window.document.body.innerHTML = html
            const document = window.document
            const filters = document.querySelector('[data-slot="command-menu-filters"]')
            expect(filters).not.toBeNull()
            expect(filters?.classList.contains('flex-wrap')).toBe(!trailing)
            for (const token of compact ? ['px-2', 'pb-1.5'] : ['px-2.5', 'pb-2']) {
              expect(filters?.classList.contains(token)).toBe(!trailing)
              if (trailing)
                expect(
                  document
                    .querySelector('[data-slot="command-menu-tabs"]')
                    ?.classList.contains(token),
                ).toBe(true)
            }
            for (const id of ['filters-type', 'filters-sort']) {
              const trigger = document.querySelector(`#${id} [role="combobox"]`)
              expect(trigger).not.toBeNull()
              for (const token of [
                'h-7',
                'px-2.5',
                'text-[length:var(--fs-body-compact,12px)]',
                'rounded-[1px]',
              ]) {
                expect(trigger?.classList.contains(token), `${id}: ${token}`).toBe(true)
              }
              expect(trigger?.classList.contains('h-9')).toBe(false)
            }
            const reset = document.querySelector('#filter-reset')
            for (const token of [
              'h-7',
              'px-3',
              'text-[length:var(--fs-body-compact,12px)]',
              'rounded-[1px]',
            ]) {
              expect(reset?.classList.contains(token), `Reset: ${token}`).toBe(true)
            }
            expect(document.querySelector('#filter-explicit')?.classList.contains('h-9')).toBe(true)
            expect(
              document.querySelector('#toggle-size')?.classList.contains(compact ? 'h-7' : 'h-9'),
            ).toBe(true)
            if (trailing)
              expect(
                document
                  .querySelector('#ambient-trailing')
                  ?.classList.contains(compact ? 'h-7' : 'h-9'),
              ).toBe(true)
            expect(
              document.querySelector('#filters-type .lucide-settings')?.getAttribute('width'),
            ).toBe('14')
            expect(
              document.querySelector('#filter-reset .lucide-settings')?.getAttribute('width'),
            ).toBe('14')
            expect(
              JSON.parse(document.querySelector('#filter-context')?.textContent ?? 'null'),
            ).toEqual({
              size: 'compact',
              shape: 'sharp',
              surface: 4,
              hoverMode: 'standard',
              reducedMotion: 'always',
              prefersReducedMotion: true,
              hasShapeProvider: true,
              hasSizeProvider: true,
            })
          } finally {
            window.close()
          }
        }),
    )
  }
}
