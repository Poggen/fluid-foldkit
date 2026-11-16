import { Effect } from 'effect'
import { renderToString } from 'foldkit/experimental/server'
import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Window } from 'happy-dom'
import { familyRootDocument } from './fixtures/family-root-document'

const subject = familyRootDocument('family-root-reserve', 'conflict')

it.effect('server reserve has the same caller root contract and inert sibling placement', () =>
  Effect.gen(function* () {
    expect(typeof document).toBe('undefined')
    const rendered = yield* renderToString(
      { block: subject.block, layer: subject.layer },
      {},
      { isHydratable: false },
    )
    const window = new Window()
    window.document.body.innerHTML = rendered.html
    const root = window.document.querySelector('[data-bkm-native-chart="family-root-reserve"]')
    if (!(root instanceof window.HTMLDivElement)) throw new Error('Missing server family root')
    expect(root.classList.contains('w-1/2')).toBe(true)
    expect(root.classList.contains('w-full')).toBe(false)
    expect(root.classList.contains('static')).toBe(true)
    expect(root.style.width).toBe('480px')
    expect(root.style.height).toBe('240px')
    expect(root.style.getPropertyValue('--root-ink')).toBe('rgb(1, 2, 3)')
    expect(root.querySelector('[data-root-context]')).not.toBeNull()
    expect(root.querySelector('[data-bkm-server-reserve] svg')).not.toBeNull()
    expect(root.querySelector('fk-bklit-family-root-reserve')).toBeNull()
    expect(subject.fixture.observed).toBeNull()
  }),
)
