// oxlint-disable no-comments/no-comments -- The actual renderer and Motion require browser classes before module acquisition.
// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
// oxlint-enable no-comments/no-comments -- Resume the source comment policy.

import { it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { expect } from 'vitest'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import { BarChart, Bar, BarDepthProvider, BarDepthBack, BarDepthFront } from '../../index'
import type { BarChartProps } from '../../bar/options'
import type { BarSnapshot, BarValue } from '../../bar/definition'
import type { BarDatum } from '../../bar/model'
import { initialInteraction } from '../state'
import { nativeObservations } from '../native-resource'

const Row = Schema.Struct({ name: Schema.String, value: Schema.Finite })
const recipe = BarChart({ name: 'bar-depth-motion-contract', Row })
const rows = [Row.make({ name: 'A', value: 50 }), Row.make({ name: 'B', value: 100 })]
const props: BarChartProps<typeof Row.Type> = {
  width: 640,
  height: 320,
  animationDuration: 1100,
  enterTransition: { duration: 0.8, ease: 'linear' },
  children: [
    BarDepthProvider({
      segmentsAccessor: (row) => [
        { value: row.value / 2, color: 'red' },
        { value: row.value / 2, color: 'blue' },
      ],
    }),
    BarDepthBack({ dataKey: 'value' }),
    Bar({ dataKey: 'value', perspective: true }),
    BarDepthFront({ dataKey: 'value' }),
  ],
}

const nextFrame = () =>
  Effect.suspend(() => {
    const frameWindow = window
    if (frameWindow.closed) return Effect.die(new Error('The test Window is closed.'))
    return Effect.callback<void>((resume) => {
      const id = frameWindow.requestAnimationFrame(() => resume(Effect.void))
      return Effect.sync(() => frameWindow.cancelAnimationFrame(id))
    }).pipe(Effect.timeout('1 second'))
  })

const until = (predicate: () => boolean) =>
  Effect.gen(function* () {
    const deadline = performance.now() + 2500
    while (!predicate() && performance.now() < deadline) yield* nextFrame()
    expect(predicate(), 'Native frames arrived but the Motion condition did not settle.').toBe(true)
  })

function mount(options = props) {
  const element = document.createElement('div')
  document.body.append(element)
  const container = document.createElement('div')
  container.className = 'ts-chart-host'
  element.append(container)
  const inputs = recipe.inputs('depth-motion', options)
  const resource = inputs.createResource?.(element, nativeObservations(element), () =>
    performance.now(),
  )
  if (resource === undefined || inputs.resourceDefinition === undefined) {
    throw new Error('Bar must provide its public resource and drawing')
  }
  let snapshot: BarSnapshot<typeof Row.Type> | undefined
  let currentRows = rows
  let state = { ...initialInteraction(recipe.configuration(options)), phaseClockReady: true }
  const definition = () => {
    const drawing = inputs.resourceDefinition?.(
      currentRows,
      state,
      (value) => {
        snapshot = value
      },
      () => performance.now(),
    )
    if (drawing === undefined) throw new Error('Bar drawing unavailable')
    return drawing
  }
  const hostOptions = {
    definition: definition(),
    width: 640,
    height: 320,
    ariaLabel: 'Bar depth motion',
    renderer: motion<BarDatum<typeof Row.Type>, BarValue, BarValue>({
      initial: false,
      respectReducedMotion: false,
    }),
  }
  const host = mountChartRenderer(container, hostOptions)
  const publish = () => {
    if (snapshot === undefined) throw new Error('Bar must publish the actual scene targets')
    resource.draw(snapshot)
    resource.update(state, currentRows, null)
  }
  resource.attach(host)
  publish()
  let destroyed = false
  return {
    element,
    update(loaded: boolean, data = currentRows, generation = state.generation) {
      currentRows = data
      state = { ...state, revealReady: loaded, generation }
      host.update({ ...hostOptions, definition: definition() })
      publish()
    },
    target() {
      const target = snapshot?.depthTargets.find(
        (entry) => entry.kind === 'back' && entry.entry.index === 0,
      )
      if (target === undefined) throw new Error('First depth target unavailable')
      return target.entry
    },
    side() {
      const side = element.querySelector<SVGGElement>('.bkm-depth-back-0-0-side')
      if (side === null) throw new Error('First side group unavailable')
      return side
    },
    clip() {
      const clip = element.querySelector<SVGRectElement>(
        '[data-bkm-depth-definitions] clipPath rect',
      )
      if (clip === null) throw new Error('Owned depth reveal clip unavailable')
      return clip
    },
    glass() {
      const glass = element.querySelector<SVGRectElement>('.bkm-depth-front-0-0-glass')
      if (glass === null) throw new Error('First glass rectangle unavailable')
      return glass
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      resource.destroy()
      host.destroy()
      element.remove()
    },
  }
}

it.live(
  'reveals fixed colored segments through one baseline clip and retires its Motion writes',
  () =>
    Effect.gen(function* () {
      const owner = yield* Effect.acquireRelease(
        Effect.sync(() => mount()),
        (value) => Effect.sync(() => value.destroy()),
      )
      yield* Effect.promise(() => Promise.resolve())
      const clip = owner.clip()
      const fixed = [...owner.side().querySelectorAll('path')].map((path) => path.getAttribute('d'))
      const target = owner.target()
      const finalHeight = target.barHeight + target.perspectiveRise
      expect(Number(clip.getAttribute('y'))).toBe(target.baselineY)
      expect(Number(clip.getAttribute('height'))).toBe(0)
      expect(owner.side().querySelectorAll('path[fill="red"],path[fill="blue"]')).toHaveLength(2)
      yield* until(() => Number(clip.getAttribute('height')) > 0)
      expect(Number(clip.getAttribute('height'))).toBeLessThan(finalHeight)
      expect(
        [...owner.side().querySelectorAll('path')].map((path) => path.getAttribute('d')),
      ).toEqual(fixed)
      expect(Number(clip.getAttribute('y')) + Number(clip.getAttribute('height'))).toBeCloseTo(
        target.baselineY,
        8,
      )
      owner.destroy()
      const retired = clip.getAttribute('height')
      yield* nextFrame()
      yield* nextFrame()
      expect(clip.getAttribute('height')).toBe(retired)
      expect(owner.element.querySelector('[data-bkm-depth-definitions]')).toBeNull()
    }),
)

it.live('honors an immediate authored transition before the chart loaded cutoff', () =>
  Effect.gen(function* () {
    const owner = yield* Effect.acquireRelease(
      Effect.sync(() => mount({ ...props, enterTransition: { duration: 0 } })),
      (value) => Effect.sync(() => value.destroy()),
    )
    yield* Effect.promise(() => Promise.resolve())
    yield* until(
      () =>
        Number(owner.clip().getAttribute('height')) ===
        owner.target().barHeight + owner.target().perspectiveRise,
    )
    expect(Number(owner.glass().getAttribute('height'))).toBe(owner.target().barHeight)
    expect(owner.element.hasAttribute('data-bkm-ready')).toBe(false)
    expect(owner.element.querySelector('.bkm-depth-back-0-0-lid')?.getAttribute('transform')).toBe(
      'translate(0 0)',
    )
  }),
)

it.live(
  'snaps a running spring at loaded, then retargets the Source settle without replaying entrance',
  () =>
    Effect.gen(function* () {
      const owner = yield* Effect.acquireRelease(
        Effect.sync(() =>
          mount({ ...props, enterTransition: { type: 'spring', stiffness: 12, damping: 8 } }),
        ),
        (value) => Effect.sync(() => value.destroy()),
      )
      yield* Effect.promise(() => Promise.resolve())
      yield* until(() => Number(owner.glass().getAttribute('height')) > 0)
      owner.update(true)
      yield* Effect.promise(() => Promise.resolve())
      expect(Number(owner.glass().getAttribute('height'))).toBe(owner.target().barHeight)
      expect(Number(owner.clip().getAttribute('height'))).toBe(
        owner.target().barHeight + owner.target().perspectiveRise,
      )
      const retainedClip = owner.clip()
      const retainedGlass = owner.glass()
      const before = Number(owner.glass().getAttribute('height'))
      owner.update(true, [Row.make({ name: 'A', value: 20 }), Row.make({ name: 'B', value: 100 })])
      yield* Effect.promise(() => Promise.resolve())
      expect(Number(owner.glass().getAttribute('height'))).toBe(before)
      const next = owner.target().barHeight
      yield* until(() => Number(owner.glass().getAttribute('height')) < before)
      expect(Number(owner.glass().getAttribute('height'))).toBeGreaterThan(next)
      owner.update(true, rows)
      yield* Effect.promise(() => Promise.resolve())
      expect(owner.clip()).toBe(retainedClip)
      expect(owner.glass()).toBe(retainedGlass)
      expect(Number(owner.glass().getAttribute('height'))).toBeGreaterThan(next)
      expect(Number(owner.glass().getAttribute('height'))).toBeLessThan(before)
      yield* until(() => Number(owner.glass().getAttribute('height')) === owner.target().barHeight)
      owner.update(false, rows, 1)
      yield* Effect.promise(() => Promise.resolve())
      expect(Number(owner.clip().getAttribute('height'))).toBe(0)
      expect(Number(owner.glass().getAttribute('height'))).toBe(0)
    }),
)
