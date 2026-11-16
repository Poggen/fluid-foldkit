import { it } from '@effect/vitest'
// @vitest-environment happy-dom -- real checked parent and native renderer ResizeObserver deliveries
import { expect } from 'vitest'
import { Effect, Schedule } from 'effect'
import { viewportFixture } from './viewport-runtime-fixture'

const eventually = (check: () => void) =>
  Effect.try(check).pipe(Effect.retry({ times: 50, schedule: Schedule.spaced('20 millis') }))

const settle = (fixture: ReturnType<typeof viewportFixture>) =>
  Effect.gen(function* settleMountedOwner() {
    yield* eventually(() => {
      fixture.flush()
      expect(fixture.model?.chart.isMounted).toBe(true)
      expect(fixture.model?.chart.phaseClockReady).toBe(true)
      expect(fixture.model?.chart.revealReady).toBe(true)
      expect(fixture.host.querySelector('.ts-chart-surface')).not.toBeNull()
    })
    yield* Effect.sleep('30 millis')
    fixture.flush()
  })

for (const family of ['line', 'area'] as const) {
  it.live(`native ${family} resizes real geometry without publishing unconsumed viewport`, () =>
    Effect.gen(function* nativeGeometryWithoutModelViewport() {
      const fixture = viewportFixture(`viewport-native-${family}`, family)

      try {
        yield* settle(fixture)
        fixture.resize(400)
        yield* settle(fixture)
        const svg = fixture.host.querySelector<SVGSVGElement>('svg.ts-chart')
        const { model } = fixture
        const { publications } = fixture
        const { views } = fixture
        fixture.resize(620)
        yield* settle(fixture)
        expect(fixture.host.querySelector('svg.ts-chart')).toBe(svg)
        expect(svg?.getAttribute('viewBox')).toContain('620')
        expect(fixture.publications).toBe(publications)
        expect(fixture.model).toBe(model)
        expect(fixture.views).toBe(views)
        expect(fixture.model?.chart.viewport._tag).toBe('None')
        fixture.resize(480)
        yield* settle(fixture)
        expect(svg?.getAttribute('viewBox')).toContain('480')
        expect(fixture.publications).toBe(publications)
        fixture.host.querySelector<HTMLButtonElement>('[data-data]')?.click()
        yield* eventually(() => {
          fixture.flush()
          expect(fixture.model?.chart.domains.left?.[1]).toBeGreaterThan(100)
        })
        expect(fixture.publications).toBeGreaterThan(publications)
      } finally {
        yield* fixture.dispose()
      }
    }),
  )
}

for (const mode of ['authored', 'derived'] as const) {
  it.live(`${mode} context receives current viewport and retained native owner`, () =>
    Effect.gen(function* publicContextViewport() {
      const fixture = viewportFixture(`viewport-${mode}`, 'line', mode)

      try {
        yield* settle(fixture)
        fixture.resize(520)
        yield* eventually(() => {
          fixture.flush()
          expect(fixture.host.querySelector('[data-viewport]')?.textContent).toBe('520')
        })
        fixture.resize(610)
        yield* eventually(() => {
          fixture.flush()
          expect(fixture.host.querySelector('[data-viewport]')?.textContent).toBe('610')
        })
        expect(
          fixture.contexts.every(
            (element) => element === fixture.host.querySelector('[data-bkm-native-chart]'),
          ),
        ).toBe(true)
      } finally {
        yield* fixture.dispose()
      }
    }),
  )
}

it.live('enabling a derived renderer publishes retained geometry without another draw', () =>
  Effect.gen(function* activateContextAtRetainedWidth() {
    const fixture = viewportFixture('viewport-demand-toggle', 'line')

    try {
      yield* settle(fixture)
      fixture.resize(575)
      yield* settle(fixture)
      const svg = fixture.host.querySelector('svg.ts-chart')
      expect(fixture.inputs.derived.definitionRevision).toBe(
        fixture.inputs.native.definitionRevision,
      )
      fixture.host.querySelector<HTMLButtonElement>('[data-mode="derived"]')?.click()
      yield* eventually(() => {
        fixture.flush()
        expect(fixture.host.querySelector('[data-viewport]')?.textContent).toBe('575')
      })
      expect(fixture.host.querySelector('svg.ts-chart')).toBe(svg)
      fixture.host.querySelector<HTMLButtonElement>('[data-mode="native"]')?.click()
      yield* settle(fixture)
      const { publications } = fixture
      fixture.resize(640)
      yield* settle(fixture)
      expect(fixture.publications).toBe(publications)
      fixture.host.querySelector<HTMLButtonElement>('[data-mode="derived"]')?.click()
      yield* eventually(() => {
        fixture.flush()
        expect(fixture.host.querySelector('[data-viewport]')?.textContent).toBe('640')
      })
    } finally {
      yield* fixture.dispose()
    }
  }),
)

it.live('concurrent original and derived descriptors keep separate container ownership', () =>
  Effect.gen(function* independentDerivedContainer() {
    const original = viewportFixture('viewport-concurrent-native', 'line')
    const derived = viewportFixture('viewport-concurrent-derived', 'line', 'derived', original)

    try {
      yield* settle(original)
      yield* settle(derived)
      derived.resize(570)
      yield* settle(derived)
      const owner = derived.host.querySelector('[data-bkm-native-chart]')
      const ref = original.contextRefs.at(-1)
      expect(ref?.current).toBe(owner)
      original.host.querySelector<HTMLButtonElement>('[data-data]')?.click()
      yield* eventually(() => {
        original.flush()
        expect(original.model?.chart.domains.left?.[1]).toBeGreaterThan(100)
      })
      expect(ref?.current).toBe(owner)
      expect(derived.host.querySelector('[data-viewport]')?.textContent).toBe('570')
    } finally {
      yield* derived.dispose()
      yield* original.dispose()
    }
  }),
)
