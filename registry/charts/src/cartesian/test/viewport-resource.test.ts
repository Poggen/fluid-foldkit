import { it } from '@effect/vitest'
// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- actual native resources and responsive renderer deliveries
import { DateTime, Effect, Schema } from 'effect'
import { expect } from 'vitest'
import { motion } from '@tanstack/charts/motion'
import { Line, LineChart, ComposedChart } from '../../index'
import { cartesianInputs } from '../root'
import type { CartesianViewInputs } from '../block'
import { initialInteraction } from '../state'
import type { Interaction } from '../state'
import type { ChartViewport } from '../viewport'
import { nativeObservations } from '../native-resource'
import { mountCartesianRenderer } from '../font-renderer'
import { runDomainObservationBrowserRegression } from '../../../test/domain-observation-browser'
import { fontAdmissionEnvironment } from '../../../test/font-admission-environment'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })

const rows = [10, 20].map((value, index) => ({
  date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
  value,
}))

const props = { animationDuration: 0, children: [Line({ dataKey: 'value' })] }

const line = LineChart({ name: 'viewport-resource-line', Row })

const composed = ComposedChart({ name: 'viewport-resource-composed', Row })

const native = line.inputs('viewport-resource', props)

const derived = native.withRenderContext((_context, h) => h.empty)

const setup = <SceneDatum>(inputs: CartesianViewInputs<typeof Row.Type, SceneDatum>) => {
  const environment = fontAdmissionEnvironment()
  const element = environment.container

  const events: Array<{
    current: Interaction['domains']
    target: Interaction['domains']
    viewport: ChartViewport | undefined
  }> = []

  const state = initialInteraction(line.configuration(props))

  const resource = inputs.createResource?.(
    element,
    {
      ...nativeObservations(element),
      domains: (current, target, viewport) => {
        events.push({ current, target, viewport })
      },
    },
    () => 0,
  )

  const compile = resource?.definition ?? inputs.resourceDefinition

  if (resource === undefined || compile === undefined) {
    throw new Error('Missing native resource compiler')
  }

  resource.prepare?.(state, rows)

  const options = {
    definition: compile(rows, state, resource.draw, () => 0),
    initialWidth: 400,
    height: 240,
    ariaLabel: 'Viewport resource',
    renderer: motion<SceneDatum, Date, number>({ initial: false }),
  }

  const host = mountCartesianRenderer(element, options, () => resource)
  resource.attach(host)

  return {
    ...environment,
    resource,
    events,
    host,
    redrawData: () => {
      host.update({
        ...options,
        definition: compile(
          rows.map((row) => ({ ...row, value: row.value * 10 })),
          state,
          resource.draw,
          () => 0,
        ),
      })
    },
    resize: (width: number) => {
      const observer = environment.observers.find((item) => item.target === element)

      if (observer === undefined) {
        throw new Error('Missing native host observer')
      }

      observer.deliver(width, 240)
      environment.flush()
    },
    dispose: () => {
      resource.destroy()
      host.destroy()
      environment.destroy()
    },
  }
}

const drain = Effect.callback((resume) => {
  queueMicrotask(() => {
    queueMicrotask(() => {
      queueMicrotask(() => {
        resume(Effect.void)
      })
    })
  })
})

for (const context of [false, true]) {
  it.live(`Composed native resizing keeps viewport demand ${String(context)}`, () =>
    Effect.gen(function* composedViewportDemand() {
      const inputs = composed.inputs(
        'composed',
        context ? { ...props, renderContext: (_context, h) => h.empty } : props,
      )

      const owner = setup(inputs)

      try {
        yield* drain
        const events = owner.events.length
        owner.resize(650)
        yield* drain
        expect(owner.host.getScene().width).toBe(650)
        expect(owner.events).toHaveLength(events + (context ? 1 : 0))
        expect(owner.events.at(-1)?.viewport?.width).toBe(context ? 650 : undefined)
      } finally {
        owner.dispose()
      }
    }),
  )
}

it.live('custom compiler retains viewport even without a public context', () =>
  Effect.gen(function* customCompilerViewport() {
    const compile = native.resourceDefinition

    if (compile === undefined) {
      throw new Error('Missing custom compiler')
    }

    const owner = setup(
      cartesianInputs(
        'line',
        'custom',
        props,
        (data, state, draw, clock, _domainFrame, _presentationProps, tooltipExtension) =>
          compile(data, state, draw, clock, tooltipExtension),
      ),
    )

    try {
      yield* drain
      owner.resize(690)
      yield* drain
      expect(owner.events.at(-1)?.viewport?.width).toBe(690)
    } finally {
      owner.dispose()
    }
  }),
)

it.live(
  'demand activation uses the newest retained snapshot and deactivation fences only viewport',
  () =>
    Effect.gen(function* demandTransitionDelivery() {
      const owner = setup(native)

      try {
        yield* drain
        const initial = owner.events.length
        owner.resize(550)
        yield* drain
        expect(owner.events).toHaveLength(initial)
        derived.configureResource?.(owner.resource)
        owner.resize(590)
        yield* drain
        expect(owner.events.at(-1)?.viewport?.width).toBe(590)
        native.configureResource?.(owner.resource)
        yield* drain
        const disabled = owner.events.length
        derived.configureResource?.(owner.resource)
        native.configureResource?.(owner.resource)
        yield* drain
        expect(owner.events).toHaveLength(disabled)
        derived.configureResource?.(owner.resource)
        yield* drain
        const beforeData = owner.events.length
        owner.redrawData()
        native.configureResource?.(owner.resource)
        yield* drain
        expect(owner.events.length).toBeGreaterThan(beforeData)
        expect(owner.events.at(-1)?.viewport).toBeUndefined()
        expect(owner.events.at(-1)?.target.left?.[1]).toBeGreaterThan(100)
      } finally {
        owner.dispose()
      }
    }),
)

it.live('destroying an owner cancels queued demand activation', () =>
  Effect.gen(function* destroyQueuedActivation() {
    const owner = setup(native)
    yield* drain
    const count = owner.events.length
    derived.configureResource?.(owner.resource)
    owner.dispose()
    yield* drain
    expect(owner.events).toHaveLength(count)
  }),
)

it.live(
  'disable resize reenable before delivery does not publish the retired demand viewport',
  () =>
    Effect.gen(function* retiredDemandEpisode() {
      const owner = setup(derived)

      try {
        yield* drain
        owner.events.length = 0
        owner.resize(510)
        native.configureResource?.(owner.resource)
        owner.resize(620)
        derived.configureResource?.(owner.resource)
        yield* drain
        expect(owner.events.map((event) => event.viewport?.width)).toEqual([620])
      } finally {
        owner.dispose()
      }
    }),
)

it.live('native-only domains still acknowledge equal snaps and changed semantic data', () =>
  runDomainObservationBrowserRegression().pipe(
    Effect.tap((result) =>
      Effect.sync(() => {
        expect(result.delivered).toBe(3)
        expect(result.updateStep).toBe('none')
      }),
    ),
  ),
)
