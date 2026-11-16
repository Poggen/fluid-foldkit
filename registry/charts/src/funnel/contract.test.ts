// oxlint-disable no-comments/no-comments -- The real renderer and Motion need browser classes during module acquisition.
// @vitest-environment happy-dom
// oxlint-enable no-comments/no-comments -- Resume source comment policy.

import { expect, vi } from 'vitest'
import { it } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode } from '@tanstack/charts'
import { funnelDefinition } from './definition'
import type { FunnelDatum } from './focus'
import { FunnelChart } from './index'
import { Effect, Option, Predicate } from 'effect'
import { constant, constUndefined } from 'effect/Function'
import { PieChart, PieData } from '../pie'

const flat = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneNode> =>
  nodes.flatMap((n) => (n.kind === 'group' ? flat(n.children) : [n]))

it('renders source funnel layers, gradients, labels, grids and orientation using the real mark engine', () => {
  const runtime = createChartRuntime<FunnelDatum, number, number>()

  try {
    const definition = funnelDefinition(
      {
        data: [
          {
            label: 'First',
            value: 100,
            gradient: [
              { offset: '50%', color: 'red' },
              { offset: 1, color: 'blue' },
            ],
          },
          { label: 'Last', value: 25, displayValue: 'quarter' },
        ],
        orientation: 'vertical',
        layers: 2,
        edges: 'straight',
        grid: true,
        labelLayout: 'grouped',
        labelAlign: 'end',
        formatPercentage: (p) => `p${p}`,
      },
      'contract',
      false,
    )

    const scene = runtime.render(definition, { width: 320, height: 576 })
    const nodes = flat(scene.nodes)

    expect(nodes.filter((n) => n.kind === 'area')).toHaveLength(4)

    const texts = nodes
      .filter((n) => n.kind === 'label')
      .map((n) => (n.kind === 'label' ? n.text : ''))

    expect(texts).toEqual(['100', 'p100', 'First', 'quarter', 'p25', 'Last'])
    expect(nodes.some((n) => n.kind === 'area' && n.path?.includes('C') === true)).toBe(false)
    expect(definition.gradients?.[0]?.stops[0]?.offset).toBe(0.5)

    if (!Predicate.isObject(definition.focus)) {
      throw new TypeError('Missing funnel focus')
    }

    expect(definition.focus.navigation(scene.points).map((p) => p.datum.stage)).toEqual([0, 1])
  } finally {
    runtime.destroy()
  }
})

it.effect('retains finite zero-first-stage geometry and public data/focus operations', () => {
  const runtime = createChartRuntime<FunnelDatum, number, number>()

  try {
    const scene = runtime.render(
      funnelDefinition(
        {
          data: [
            { label: 'Zero', value: 0 },
            { label: 'Overflow', value: 2 },
          ],
          showLabels: false,
          showValues: false,
          showPercentage: false,
        },
        'zero',
        false,
      ),
      { width: 320, height: 150 },
    )

    expect(
      flat(scene.nodes).every((n) => n.kind !== 'area' || !/NaN|Infinity/u.test(n.path ?? '')),
    ).toBe(true)
  } finally {
    runtime.destroy()
  }

  const funnel = FunnelChart({ name: 'funnel-contract' })
  const Key = Symbol('FunnelContract')
  const Declared = Block.make(funnel.namespace, { ...funnel.contract, key: Key })

  return Story.story(
    { block: Declared, layer: Declared.makeLayer(funnel.plans<typeof Key>(Declared)) },
    Story.init('funnel', [{ label: 'First', value: 100 }]),
    Story.inMessage(Declared.InMessage.RequestedFocus({ index: 0 })),
    Story.model((model) => expect(Option.getOrNull(model.focusedIndex)).toBe(0)),
    Story.inMessage(Declared.InMessage.RequestedData({ data: [] })),
    Story.model((model) => expect(model.data).toEqual([])),
  )
})

it.effect(
  'publishes an accepted same-size Funnel measurement for a new drawing while other polar families keep their no-op',
  () => {
    const funnel = FunnelChart({ name: 'funnel-layout-acceptance' })
    const Key = Symbol('FunnelLayout')
    const Declared = Block.make(funnel.namespace, { ...funnel.contract, key: Key })
    const pie = PieChart({ name: 'pie-layout-unchanged', Row: PieData })
    const PieKey = Symbol('PieLayout')
    const Pie = Block.make(pie.namespace, { ...pie.contract, key: PieKey })

    return Effect.gen(function* () {
      yield* Story.story(
        { block: Declared, layer: Declared.makeLayer(funnel.plans<typeof Key>(Declared)) },
        Story.init('funnel', [{ label: 'A', value: 1 }]),
        Story.message(Declared.Message.ObservedSize({ size: 320 })),
        Story.models(
          Story.steps(Story.message(Declared.Message.ObservedSize({ size: 320 }))),
          (first, repeated) => {
            expect(repeated).toEqual(first)
            expect(repeated).not.toBe(first)
            expect(repeated.data).toBe(first.data)
            expect(repeated.control).toBe(first.control)
          },
        ),
      )
      yield* Story.story(
        { block: Pie, layer: Pie.makeLayer(pie.plans<typeof PieKey>(Pie)) },
        Story.init('pie', [{ label: 'A', value: 1 }]),
        Story.message(Pie.Message.ObservedSize({ size: 320 })),
        Story.models(
          Story.steps(Story.message(Pie.Message.ObservedSize({ size: 320 }))),
          (first, repeated) => expect(repeated).toBe(first),
        ),
      )
    })
  },
)

class MeasuredResizeObserver implements ResizeObserver {
  readonly notifyResize: ResizeObserverCallback
  constructor(notifyResize: ResizeObserverCallback) {
    this.notifyResize = notifyResize
  }
  observe() {
    this.notifyResize([], this)
  }
  readonly unobserve = constUndefined
  readonly disconnect = constUndefined
}

const finishAnimations = (element: Element) =>
  Effect.gen(function* () {
    const animations = [element, ...element.querySelectorAll('*')].flatMap((node) =>
      node.getAnimations(),
    )

    const completions: Array<Promise<Animation>> = []

    for (const animation of animations) {
      animation.finish()
      completions.push(animation.finished)
    }

    yield* Effect.promise(constant(Promise.all(completions)))
  })

it.effect('public Funnel hover animates beyond twenty-four stages and eight layers', () =>
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const observer = globalThis.ResizeObserver
        globalThis.ResizeObserver = MeasuredResizeObserver

        const bounds = vi
          .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
          .mockReturnValue(new DOMRect(0, 0, 1000, 300))

        return () => {
          bounds.mockRestore()
          globalThis.ResizeObserver = observer
        }
      }),
      (restore) => Effect.sync(restore),
    )

    const data = Array.from({ length: 25 }, (_, index) => ({
      label: `Stage ${index}`,
      value: 100 - index,
    }))

    const recipe = FunnelChart({ name: 'large-funnel' })

    const inputs = recipe.inputs('large" funnel', {
      data,
      staggerDelay: 0,
      layers: 10,
      enterTransition: { duration: 0 },
    })

    const element = document.createElement('div')
    document.body.append(element)

    const host = yield* Effect.acquireRelease(
      Effect.sync(() =>
        inputs.mount(
          element,
          data,
          null,
          () => {},
          () => performance.now(),
          () => {},
        ),
      ),
      (mounted) =>
        finishAnimations(element).pipe(
          Effect.andThen(
            Effect.sync(() => {
              mounted.destroy()
              element.remove()
            }),
          ),
        ),
    )

    host.acceptLayout?.(1000, true)
    const stages = element.querySelector('.bkm-stages')?.children
    const lastLabel = stages?.[24]?.querySelector('.bkm-fl')
    const lastRing = stages?.[24]?.querySelector('.bkm-l9')

    if (
      lastLabel === null ||
      lastLabel === undefined ||
      lastRing === null ||
      lastRing === undefined
    ) {
      throw new Error('Expected all twenty-five real Funnel stages')
    }

    yield* finishAnimations(element)
    host.update(data, 0)
    expect(
      lastLabel
        .getAnimations()
        .flatMap((animation) =>
          animation.effect instanceof KeyframeEffect
            ? animation.effect.getKeyframes().map((frame) => frame.opacity)
            : [],
        ),
    ).toContain('0.4')
    yield* finishAnimations(element)
    host.update(data, 24)
    expect(lastRing.getAnimations().length).toBeGreaterThan(0)
    expect(getComputedStyle(stages?.[24] ?? lastLabel).getPropertyValue('--bkm-fi')).toBe('24')
    expect(
      element
        .querySelector<HTMLElement>('[data-bkm-chart="funnel"]')
        ?.style.getPropertyValue('--bkm-hot9'),
    ).toBe('scale(1, 1.12)')
    yield* finishAnimations(element)
    expect(element.querySelector<HTMLElement>('[data-bkm-chart="funnel"]')?.dataset.hover).toBe(
      '24',
    )
  }).pipe(Effect.scoped),
)
