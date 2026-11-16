// oxlint-disable no-comments/no-comments -- The real renderer and Motion require browser classes at module acquisition.
// @vitest-environment happy-dom
// oxlint-enable no-comments/no-comments -- Resume the source comment policy.

import { it } from '@effect/vitest'
import { Effect, Function, Schema } from 'effect'
import { expect } from 'vitest'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import type { SceneNode, SceneRect } from '@tanstack/charts'
import { BarChart } from '../src/bar/root'
import { Bar } from '../src/bar/carriers'
import { barFrontClass } from '../src/bar/front-precision'
import type { BarChartProps } from '../src/bar/options'
import type { BarDatum } from '../src/bar/model'
import type { BarValue } from '../src/bar/definition'
import { initialInteraction } from '../src/cartesian/state'
import { nativeObservations } from '../src/cartesian/native-resource'

const Row = Schema.Struct({
  name: Schema.String,
  value: Schema.Finite,
  other: Schema.optionalKey(Schema.Finite),
})

const recipe = BarChart({ name: 'bar-front-precision', Row })

const first = Row.make({ name: 'A', value: 37, other: 11 })

const second = Row.make({ name: 'B', value: 91, other: 23 })

const rows = [first, second]

const props: BarChartProps<typeof Row.Type> = {
  width: 643,
  height: 321,
  animationDuration: 1100,
  enterTransition: { duration: 0.15, ease: 'linear' },
  children: [Bar({ dataKey: 'value', lineCap: 3.123456, staggerDelay: 0 })],
}

const fronts = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneRect> =>
  nodes.flatMap((node) => {
    if (node.kind === 'group') {
      return fronts(node.children)
    }

    return node.kind === 'rect' && node.key.startsWith('bars:') ? [node] : []
  })

const nextFrame = () =>
  Effect.callback((resume) => {
    const frameWindow = window

    const id = frameWindow.requestAnimationFrame(() => {
      resume(Effect.void)
    })

    return Effect.sync(() => {
      frameWindow.cancelAnimationFrame(id)
    })
  }).pipe(Effect.timeout('1 second'))

const until = (predicate: () => boolean) =>
  Effect.gen(function* untilMotionCondition() {
    const deadline = performance.now() + 2500

    while (!predicate() && performance.now() < deadline) {
      yield* nextFrame()
    }

    expect(predicate(), 'Natural Motion frames must reach the authored geometry.').toBe(true)
  })

const microtask = () => Effect.promise(Function.constant(Promise.resolve()))

const pixels = (value: string) => {
  expect(value).toMatch(/px$/u)

  return Number(value.slice(0, -2))
}

const current = (node: Element, field: string): string => {
  const root = node.closest('[data-bkm-kit]')
  const view = node.ownerDocument.defaultView

  if (root === null || view === null) {
    throw new Error('Mounted Bar ownership required')
  }

  for (const style of root.querySelectorAll<HTMLStyleElement>(
    'style[data-bkm-bar-current-geometry]',
  )) {
    for (const rule of style.sheet?.cssRules ?? []) {
      if (rule instanceof view.CSSStyleRule && node.matches(rule.selectorText)) {
        return rule.style.getPropertyValue(`--bkm-bar-current-${field}`).trim()
      }
    }
  }

  return ''
}

const target = (node: Element, field: string) =>
  getComputedStyle(node).getPropertyValue(`--bkm-bar-target-${field}`).trim()

const mount = (id: string, initialOptions = props, loaded = false) => {
  let options = initialOptions
  const element = document.createElement('div')
  document.body.append(element)
  const container = document.createElement('div')
  container.className = 'ts-chart-host'
  element.append(container)
  let inputs = recipe.inputs(id, options)

  const resource = inputs.createResource?.(element, nativeObservations(element), () =>
    performance.now(),
  )

  if (resource === undefined) {
    throw new Error('Bar must expose its actual public resource')
  }

  let data = rows

  let state = {
    ...initialInteraction(recipe.configuration(options)),
    phaseClockReady: true,
    revealReady: loaded,
  }

  const definition = () => {
    const drawing = inputs.resourceDefinition?.(data, state, resource.draw, () => performance.now())

    if (drawing === undefined) {
      throw new Error('Bar must expose its public drawing')
    }

    return drawing
  }

  const renderer = motion<BarDatum<typeof Row.Type>, BarValue, BarValue>({
    initial: false,
    respectReducedMotion: false,
  })

  const host = mountChartRenderer(container, {
    definition: definition(),
    width: 643,
    height: 321,
    renderer,
    ariaLabel: 'Bar precision',
  })

  resource.attach(host)
  resource.update(state, data, null)
  let disposed = false

  return {
    element,
    rect(index = 0) {
      const rect = element.querySelector<SVGRectElement>(`rect[data-ts-key="bars:${index}:value"]`)

      if (rect === null) {
        throw new Error('The real first front must be mounted')
      }

      return rect
    },
    geometry(index = 0) {
      const value = fronts(host.getScene().nodes).find((node) => node.key === `bars:${index}:value`)

      if (value === undefined) {
        throw new Error('The resolved front must exist')
      }

      return value
    },
    points: () => host.getScene().points,
    update(
      nextLoaded: boolean,
      nextRows = data,
      nextOptions = options,
      generation = state.generation,
    ) {
      data = nextRows
      options = nextOptions
      inputs = recipe.inputs(id, options)

      if (inputs.configureResource?.(resource) !== true) {
        throw new Error('Bar must retain its real resource')
      }

      state = {
        ...state,
        configuration: recipe.configuration(options),
        revealReady: nextLoaded,
        generation,
      }
      host.update({
        definition: definition(),
        width: 643,
        height: 321,
        renderer,
        ariaLabel: 'Bar precision',
      })
      resource.update(state, data, null)
    },
    destroy: () => {
      if (disposed) {
        return
      }

      disposed = true
      resource.destroy()
      host.destroy()
      element.remove()
    },
  }
}

it.live(
  'preserves exact live growth through a real SDK patch and retargets before the loaded snap',
  () =>
    Effect.gen(function* patchAndRetarget() {
      const owner = yield* Effect.acquireRelease(
        Effect.sync(() => mount('front-a')),
        (value) => Effect.sync(value.destroy),
      )

      yield* microtask()
      const rect = owner.rect()
      expect(pixels(current(rect, 'height'))).toBe(0)
      expect(pixels(current(rect, 'y'))).toBe(281)
      expect(target(rect, 'x')).toBe(`${owner.geometry().x}px`)
      expect(target(rect, 'height')).toBe(`${owner.geometry().height}px`)
      expect(owner.geometry().height).not.toBe(Number(rect.getAttribute('height')))
      expect(owner.points()[0]?.datum.source).toBe(rows[0])
      expect(getComputedStyle(rect).getPropertyValue('--bkm-bar-radius')).toBe('3.123456px')
      yield* until(() => pixels(current(rect, 'height')) > 0)

      const before = {
        x: current(rect, 'x'),
        y: current(rect, 'y'),
        width: current(rect, 'width'),
        height: current(rect, 'height'),
      }

      const changed = [Row.make({ name: 'A', value: 63 }), second]
      owner.update(false, changed, { ...props, barWidth: 170.12345, margin: { left: 25.23456 } })
      expect(owner.rect()).toBe(rect)

      for (const field of ['x', 'y', 'width', 'height'] as const) {
        expect(current(rect, field)).toBe(before[field])
      }

      yield* microtask()
      expect(pixels(current(rect, 'x'))).toBeLessThanOrEqual(pixels(before.x))
      expect(pixels(current(rect, 'x'))).toBeGreaterThan(owner.geometry().x)
      expect(pixels(current(rect, 'height'))).toBeGreaterThanOrEqual(pixels(before.height))
      expect(pixels(current(rect, 'height'))).toBeLessThan(owner.geometry().height)
      expect(pixels(target(rect, 'x'))).toBe(owner.geometry().x)
      expect(owner.points()[0]?.datum.source).toBe(changed[0])
      yield* until(() => current(rect, 'x') !== before.x)
      expect(pixels(current(rect, 'x'))).toBeGreaterThan(owner.geometry().x)
      owner.update(true)
      yield* microtask()
      expect(current(rect, 'height')).toBe('')
      expect(current(rect, 'x')).toBe('')
      expect(target(rect, 'height')).toBe(`${owner.geometry().height}px`)
      owner.update(true, rows, { ...props, barWidth: 51.98765 })
      expect(target(rect, 'width')).toBe(`${owner.geometry().width}px`)
      expect(current(rect, 'width')).toBe('')
    }),
)

it.live('replays only the requested root and retires all current geometry rules on removal', () =>
  Effect.gen(function* replayAndDispose() {
    const a = yield* Effect.acquireRelease(
      Effect.sync(() => mount('front-[α]:a', props, true)),
      (value) => Effect.sync(value.destroy),
    )

    const b = yield* Effect.acquireRelease(
      Effect.sync(() => mount('front-b', { ...props, barWidth: 43.98765 }, true)),
      (value) => Effect.sync(value.destroy),
    )

    yield* microtask()
    const bRect = b.rect()
    const bTarget = target(bRect, 'width')
    expect(bTarget).toBe(`${b.geometry().width}px`)
    expect(current(bRect, 'height')).toBe('')
    a.update(false, rows, props, 1)
    yield* microtask()
    expect(pixels(current(a.rect(), 'height'))).toBe(0)
    expect(current(bRect, 'height')).toBe('')
    expect(target(bRect, 'width')).toBe(bTarget)
    yield* until(() => pixels(current(a.rect(), 'height')) > 0)
    a.update(false, rows, props, 2)
    yield* microtask()
    expect(pixels(current(a.rect(), 'height'))).toBe(0)
    const style = a.element.querySelector('[data-bkm-bar-current-geometry]')
    expect(style).not.toBeNull()
    a.destroy()
    yield* nextFrame()
    expect(style?.isConnected).toBe(false)
    expect(a.element.querySelector('[data-bkm-bar-current-geometry]')).toBeNull()
    expect(b.rect()).toBe(bRect)
    expect(target(bRect, 'width')).toBe(bTarget)
    expect(current(bRect, 'height')).toBe('')
  }),
)

it.live(
  'uses Motion JS fallback for immediate fade geometry and Source horizontal grow fields',
  () =>
    Effect.gen(function* fadeAndHorizontal() {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

          if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
            throw new Error('Bar geometry test requires scoped WAAPI capability removal')
          }

          return descriptor
        }),
        (descriptor) =>
          Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
      )

      const fadeProps = {
        ...props,
        enterTransition: { duration: 0 },
        children: [Bar({ dataKey: 'value', animationType: 'fade' })],
      } satisfies BarChartProps<typeof Row.Type>

      const fade = yield* Effect.acquireRelease(
        Effect.sync(() => mount('front-fade', fadeProps)),
        (value) => Effect.sync(value.destroy),
      )

      const horizontal = yield* Effect.acquireRelease(
        Effect.sync(() =>
          mount('front-horizontal', {
            ...props,
            orientation: 'horizontal',
            stacked: true,
            children: [Bar({ dataKey: 'value' }), Bar({ dataKey: 'other' })],
          }),
        ),
        (value) => Effect.sync(value.destroy),
      )

      yield* microtask()
      expect(current(fade.rect(), 'height')).toBe('')
      expect(target(fade.rect(), 'height')).toBe(`${fade.geometry().height}px`)
      const changed = [Row.make({ name: 'A', value: 17 }), second]
      fade.update(false, changed, fadeProps)
      expect(target(fade.rect(), 'height')).toBe(`${fade.geometry().height}px`)
      expect(current(fade.rect(), 'height')).toBe('')
      const h = horizontal.rect()
      expect(pixels(current(h, 'x'))).toBe(40)
      expect(pixels(current(h, 'width'))).toBe(0)
      expect(pixels(current(h, 'height'))).toBe(horizontal.geometry().height)
      expect(pixels(current(h, 'y'))).toBe(horizontal.geometry().y)
      expect(target(h, 'x')).toBe(`${horizontal.geometry().x}px`)

      const upper = horizontal.element.querySelector<SVGRectElement>(
        'rect[data-ts-key="bars:0:other"]',
      )

      if (upper === null) {
        throw new Error('Expected the real second stacked front')
      }

      expect(pixels(current(upper, 'x'))).toBe(40)
      expect(pixels(target(upper, 'x'))).toBeGreaterThan(40)
      yield* until(() => pixels(current(h, 'width')) > 0)
      horizontal.update(true)
      yield* microtask()
      expect(current(upper, 'x')).toBe('')
      expect(pixels(target(upper, 'x'))).toBeGreaterThan(40)
    }),
)

it.live(
  'keeps a running actor on timing-only changes and uses current authored timing on the next target',
  () =>
    Effect.gen(function* currentTiming() {
      const delayed = {
        ...props,
        enterTransition: { duration: 0.8, ease: 'linear' },
        children: [Bar({ dataKey: 'value', staggerDelay: 1 })],
      } satisfies BarChartProps<typeof Row.Type>

      const owner = yield* Effect.acquireRelease(
        Effect.sync(() => mount('front-current-timing', delayed)),
        (value) => Effect.sync(value.destroy),
      )

      yield* microtask()
      yield* until(() => pixels(current(owner.rect(), 'height')) > 0)
      const waiting = owner.rect(1)
      expect(pixels(current(waiting, 'height'))).toBe(0)

      const immediate = {
        ...props,
        enterTransition: { duration: 0 },
        children: [Bar({ dataKey: 'value', staggerDelay: 0 })],
      } satisfies BarChartProps<typeof Row.Type>

      owner.update(false, rows, immediate)
      yield* microtask()
      expect(pixels(current(waiting, 'height'))).toBe(0)
      owner.update(false, [first, Row.make({ name: 'B', value: 20 })], immediate)
      yield* microtask()
      yield* nextFrame()
      yield* nextFrame()
      expect(pixels(current(waiting, 'height'))).toBe(owner.geometry(1).height)
    }),
)

it.effect(
  'keeps distinct root/key tuples disjoint even when their encoded concatenations collide',
  () =>
    Effect.sync(() => {
      expect(barFrontClass('chart', 'bars:0:bars:1:value')).not.toBe(
        barFrontClass('chartbars:0:', 'bars:1:value'),
      )
    }),
)

it.live(
  'restarts a replacement category while retaining its public point key and same-category retargets',
  () =>
    Effect.gen(function* categoryActor() {
      const owner = yield* Effect.acquireRelease(
        Effect.sync(() => mount('front-category')),
        (value) => Effect.sync(value.destroy),
      )

      yield* microtask()
      yield* until(() => pixels(current(owner.rect(), 'height')) > 0)
      const rect = owner.rect()
      const pointKey = owner.points()[0]?.key
      const replacement = Row.make({ name: 'C', value: first.value })
      owner.update(false, [replacement, second])
      yield* microtask()
      expect(owner.rect()).toBe(rect)
      expect(pixels(current(rect, 'height'))).toBe(0)
      expect(owner.points()[0]?.key).toBe(pointKey)
      expect(owner.points()[0]?.datum.source).toBe(replacement)
      yield* until(() => pixels(current(rect, 'height')) > 0)
      const running = current(rect, 'height')
      const updated = Row.make({ name: 'C', value: 52 })
      owner.update(false, [updated, second])
      expect(current(rect, 'height')).toBe(running)
      yield* microtask()
      expect(pixels(current(rect, 'height'))).toBeGreaterThanOrEqual(pixels(running))
      expect(pixels(current(rect, 'height'))).toBeLessThan(owner.geometry().height)
      expect(owner.points()[0]?.datum.source).toBe(updated)
    }),
)
