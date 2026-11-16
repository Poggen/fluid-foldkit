// oxlint-disable no-comments/no-comments -- The actual renderer and Motion require browser classes before module acquisition.
// @vitest-environment happy-dom
// oxlint-enable no-comments/no-comments -- Resume the source comment policy.

import { it } from '@effect/vitest'
import { DateTime, Effect, Schema } from 'effect'
import { expect } from 'vitest'
import type { ChartTooltipExtension } from '@tanstack/charts/tooltip'
import { nativeTooltip } from '../src/cartesian/native-tooltip'
import { acquireTooltipAttachment } from '../src/cartesian/tooltip-attachment'
import type { SceneNode } from '@tanstack/charts'
import { createScatterPaintLayer } from '../src/scatter/paint-layer'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import { ScatterChart, Scatter, ChartTooltip } from '@foldkit-visuals/charts/scatter'
import type { CartesianSnapshot } from '../src/cartesian/definition'
import { initialInteraction } from '../src/cartesian/state'
import { CandlestickChart, Candlestick, YAxis } from '@foldkit-visuals/charts/candlestick'
import { nativeObservations } from '../src/cartesian/native-resource'

const Row = Schema.Struct({ date: Schema.DateFromString, value: Schema.Finite })
const rows = [10, 20].map((value, index) =>
  Row.make({
    date: DateTime.toDateUtc(DateTime.makeUnsafe(index * 86_400_000)),
    value,
  }),
)
const recipe = ScatterChart({ name: 'scatter-motion-contract', Row })
const props = {
  width: 640,
  height: 320,
  animationDuration: 1100,
  enterTransition: { duration: 0.3, ease: 'linear' },
  children: [Scatter({ dataKey: 'value', outlineWidth: 2 }), ChartTooltip()],
}
const state = { ...initialInteraction(recipe.configuration(props)), phaseClockReady: true }
const allNodes = (nodes: ReadonlyArray<SceneNode>): ReadonlyArray<SceneNode> =>
  nodes.flatMap((node) => (node.kind === 'group' ? [node, ...allNodes(node.children)] : [node]))

function drawing(
  ready: boolean,
  radius = 5,
  publish = (_: CartesianSnapshot<typeof Row.Type>) => {},
  splitRoles = false,
  tooltip = true,
  observations: ReadonlyArray<typeof Row.Type> = rows,
  strokeWidth = 3,
  outlineWidth = 2,
  tooltipExtension?: ChartTooltipExtension,
) {
  const definition = recipe
    .inputs('scatter-motion', {
      ...props,
      children: [
        Scatter({
          dataKey: 'value',
          outlineWidth,
          radius,
          ...(splitRoles ? { stroke: 'navy', strokeWidth, ringGap: 1, fadeOnHover: false } : {}),
        }),
        ...(tooltip ? [ChartTooltip()] : []),
      ],
    })
    .resourceDefinition?.(
      observations,
      { ...state, revealReady: ready },
      publish,
      () => 0,
      tooltipExtension,
    )

  if (definition === undefined) {
    throw new Error('The real Scatter recipe must provide its drawing')
  }

  return definition
}

it.effect(
  'retains original public points while composing all roles under one phase-qualified paint group',
  () =>
    Effect.sync(() => {
      const runtime = createChartRuntime<typeof Row.Type, Date, number>()
      let snapshot: CartesianSnapshot<typeof Row.Type> | undefined

      try {
        expect(state.configuration.animationDuration).toBe(1100)
        const entering = runtime.render(
          drawing(false, 5, (value) => {
            snapshot = value
          }),
          { width: 640, height: 320 },
        )
        const groups = allNodes(entering.nodes).filter(
          (node) => node.className === 'bkm-scatter-enter',
        )
        expect(groups).toHaveLength(2)
        expect(groups.every((node) => node.kind === 'group' && node.children.length === 3)).toBe(
          true,
        )
        expect(entering.points.map((point) => point.markId)).toEqual([
          'value:outline',
          'value:outline',
          'value',
          'value',
          'value',
          'value',
        ])
        expect(entering.points.every((point) => rows.includes(point.datum))).toBe(true)
        expect(
          allNodes(entering.nodes)
            .filter((node) => node.kind === 'dot')
            .every((node) => node.kind === 'dot' && node.x === 0 && node.y === 0),
        ).toBe(true)
        const last = snapshot?.scatterPaint?.entrance.at(-1)
        expect(last?.delay).toBeGreaterThan(0)
        expect(last?.delay).toBeLessThan(0.3)
        const repeated = [rows[0], rows[1]].filter((row) => row !== undefined)
        const first = repeated[0]

        if (first === undefined) {
          throw new Error('The real occurrence case requires its first row')
        }

        const duplicate = Row.make({ date: first.date, value: 30 })
        const occurrences = runtime.render(
          drawing(false, 5, () => {}, false, false, [first, duplicate, first]),
          { width: 640, height: 320 },
        )
        const frames = allNodes(occurrences.nodes).filter(
          (node) => node.kind === 'group' && node.className?.startsWith('bkm-scatter-frame-'),
        )
        expect(frames).toHaveLength(3)
        expect(new Set(frames.map((node) => node.key)).size).toBe(3)
        expect(frames[0]?.kind === 'group' && frames[0].translateY).not.toBe(
          frames[1]?.kind === 'group' && frames[1].translateY,
        )
        expect(occurrences.points.filter((point) => point.datum === first)).toHaveLength(6)
        const ready = runtime.render(drawing(true), { width: 640, height: 320 })
        expect(ready.points.map((point) => point.key)).toEqual(
          entering.points.map((point) => point.key),
        )
        expect(ready.points.map((point) => point.datum)).toEqual(
          entering.points.map((point) => point.datum),
        )
        expect(allNodes(ready.nodes).some((node) => node.className === 'bkm-scatter-enter')).toBe(
          false,
        )
        expect(
          allNodes(ready.nodes).filter((node) => node.className === 'bkm-scatter-static'),
        ).toHaveLength(2)
        expect(
          allNodes(ready.nodes).filter(
            (node) => node.className === 'bkm-scatter-base bkm-scatter-dim',
          ),
        ).toHaveLength(1)
      } finally {
        runtime.destroy()
      }
    }),
)

it.live(
  'owns fixed Source opacity/filter on one real point group and immediately replaces ready geometry',
  () =>
    Effect.gen(function* scatterMotionOwner() {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')

          if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
            throw new Error('Scatter resource test requires scoped WAAPI capability removal')
          }

          return descriptor
        }),
        (descriptor) =>
          Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
      )
      const element = document.createElement('div')
      document.body.append(element)
      const inputs = recipe.inputs('scatter-motion', {
        ...props,
        children: [Scatter({ dataKey: 'value', outlineWidth: 2 })],
      })

      if (inputs.createResource === undefined) {
        throw new Error('Scatter requires its actual chart resource')
      }

      const owner = inputs.createResource(element, nativeObservations(element), () =>
        performance.now(),
      )
      const container = document.createElement('div')
      container.className = 'ts-chart-host'
      element.append(container)
      let snapshot: CartesianSnapshot<typeof Row.Type> | undefined
      const definition = drawing(
        false,
        5,
        (value) => {
          snapshot = value
          owner.draw(value)
        },
        false,
        false,
      )
      const options = {
        definition,
        width: 640,
        height: 320,
        ariaLabel: 'Scatter motion contract',
        renderer: motion<typeof Row.Type, Date, number>({
          initial: false,
          respectReducedMotion: false,
        }),
      }
      const host = mountChartRenderer(container, options)
      owner.attach(host)

      try {
        if (snapshot === undefined) {
          throw new Error('Scatter must publish its real renderer projection')
        }

        owner.draw(snapshot)
        owner.update(state, rows, null)
        const group = element.querySelector<SVGGElement>('g.bkm-scatter-enter')

        if (group === null) {
          throw new Error('Scatter must reserve its physical point group')
        }

        expect(group.querySelectorAll('circle')).toHaveLength(3)
        expect(Number(group.style.opacity || group.getAttribute('opacity'))).toBe(0)
        expect(group.style.filter || group.getAttribute('filter')).toBe('blur(2px)')
        let opacity = 0

        const acquiredAt = performance.now()

        while (opacity === 0 && performance.now() - acquiredAt < 2000) {
          yield* Effect.sleep('10 millis')
          opacity = Number(group.style.opacity || group.getAttribute('opacity'))
        }

        expect(opacity).toBeGreaterThan(0)
        expect(opacity).toBeLessThanOrEqual(1)
        host.update({
          ...options,
          definition: drawing(
            false,
            7,
            (value) => {
              snapshot = value
              owner.draw(value)
            },
            false,
            false,
          ),
        })
        expect(element.querySelector('g.bkm-scatter-enter')).toBe(group)
        owner.draw(snapshot)
        owner.update(state, rows, null)
        expect(Number(group.style.opacity || group.getAttribute('opacity'))).toBeGreaterThanOrEqual(
          opacity,
        )
        const focused = host.getScene().points[0]

        if (focused === undefined) {
          throw new Error('The actual Scatter scene must retain its focus point')
        }

        host.interaction.setControlledFocus(focused)
        expect(element.querySelector('g.bkm-scatter-enter')).toBe(group)
        expect(Number(group.style.opacity || group.getAttribute('opacity'))).toBeGreaterThanOrEqual(
          opacity,
        )
        host.interaction.setControlledFocus(null)
        host.update({
          ...options,
          definition: drawing(
            true,
            7,
            (value) => {
              owner.draw(value)
            },
            false,
            false,
          ),
        })
        owner.update({ ...state, revealReady: true }, rows, null)
        expect(group.isConnected).toBe(false)
        expect(element.querySelectorAll('g.bkm-scatter-enter')).toHaveLength(0)
        const base = element.querySelector('g.bkm-scatter-static')
        expect(base?.querySelectorAll('circle')).toHaveLength(3)
        host.update({
          ...options,
          definition: drawing(
            true,
            9,
            (value) => {
              owner.draw(value)
            },
            false,
            false,
          ),
        })
        expect(element.querySelector('g.bkm-scatter-static')).toBe(base)
        expect(
          [...element.querySelectorAll('g.bkm-scatter-static circle')].some(
            (node) => node.getAttribute('r') === '9',
          ),
        ).toBe(true)
      } finally {
        owner.destroy()
        host.destroy()
        expect(element.querySelector('svg')).toBeNull()
        element.remove()
      }
    }),
)

it.effect('clips only the real Candle drawing viewport, leaving its overlay host visible', () =>
  Effect.sync(() => {
    const CandleRow = Schema.Struct({
      date: Schema.DateFromString,
      open: Schema.Finite,
      high: Schema.Finite,
      low: Schema.Finite,
      close: Schema.Finite,
    })
    const candleRows = [
      CandleRow.make({
        date: rows[0]?.date ?? DateTime.toDateUtc(DateTime.makeUnsafe(0)),
        open: 10,
        high: 20,
        low: 5,
        close: 15,
      }),
    ]
    const candle = CandlestickChart({ name: 'candle-viewport-contract', Row: CandleRow })
    const candleProps = {
      width: 640,
      height: 320,
      animationDuration: 0,
      children: [Candlestick(), YAxis()],
    }
    const inputs = candle.inputs('candle-viewport', candleProps)
    const element = document.createElement('div')
    const drawing = document.createElement('div')
    drawing.className = 'ts-chart-host'
    element.append(drawing)
    document.body.append(element)

    if (inputs.createResource === undefined || inputs.resourceDefinition === undefined) {
      throw new Error('Candle must expose its actual drawing resource')
    }

    const resource = inputs.createResource(element, nativeObservations(element), () =>
      performance.now(),
    )
    const definition = inputs.resourceDefinition(
      candleRows,
      initialInteraction(candle.configuration(candleProps)),
      resource.draw,
      () => performance.now(),
    )
    const host = mountChartRenderer(drawing, {
      definition,
      width: 640,
      height: 320,
      ariaLabel: 'Candle viewport',
      renderer: motion<typeof CandleRow.Type, Date, number>({ initial: false }),
    })

    try {
      resource.attach(host)
      expect(getComputedStyle(drawing).overflow).not.toBe('hidden')
      expect(getComputedStyle(element).overflow).not.toBe('hidden')
      const axis = element.querySelector('[data-ts-key$=":source-y-axes"]')
      expect(axis?.namespaceURI).toBe('http://www.w3.org/2000/svg')
      expect(axis?.closest('svg.ts-chart')).not.toBeNull()
      expect(axis?.closest('[clip-path]')).toBeNull()
      expect(element.querySelector('.bkm-y-axes')).toBeNull()
    } finally {
      resource.destroy()
      host.destroy()
      element.remove()
    }
  }),
)

it.live('removes changed marker roles immediately and retains the explicit tooltip policy', () =>
  Effect.sync(() => {
    const element = document.createElement('div')
    document.body.append(element)
    const origin = document.createElement('div')
    const shell = document.createElement('div')
    const body = document.createElement('div')
    body.className = 'ts-chart-tooltip__body'
    shell.append(body)
    origin.append(shell)
    document.body.append(origin)
    const attachment = acquireTooltipAttachment(element, shell)
    const extension = nativeTooltip(shell, () => false, attachment.park)
    const definition = drawing(true, 5, () => {}, false, true, rows, 3, 2, extension)
    const options = {
      definition,
      width: 640,
      height: 320,
      ariaLabel: 'Scatter instant role updates',
      renderer: motion<typeof Row.Type, Date, number>({
        initial: false,
        respectReducedMotion: false,
      }),
    }
    const host = mountChartRenderer(element, options)

    try {
      const group = element.querySelector('g.bkm-scatter-static')
      expect(group?.querySelectorAll('circle')).toHaveLength(3)
      const changed = drawing(true, 7, () => {}, true, true, rows, 3, 2, extension)
      expect(changed.motion).toBe(false)
      const tooltip = changed.tooltip

      if (tooltip === false || tooltip === undefined || !('motion' in tooltip)) {
        throw new Error('Scatter requires its explicit tooltip motion policy')
      }

      expect(tooltip.motion).toMatchObject({ type: 'spring' })
      host.update({ ...options, definition: changed })
      expect(element.querySelector('g.bkm-scatter-static')).toBe(group)
      expect(group?.querySelectorAll('circle')).toHaveLength(3)
      expect(
        [...element.querySelectorAll('g.bkm-scatter-static')].map((paint) =>
          [...paint.querySelectorAll('circle')].map((circle) => circle.getAttribute('r')),
        ),
      ).toEqual([
        ['12', '7', '9.5'],
        ['12', '7', '9.5'],
      ])
      expect(
        [...element.querySelectorAll('g.bkm-scatter-static circle')].every(
          (circle) => circle.getAttribute('opacity') !== '0',
        ),
      ).toBe(true)
    } finally {
      attachment.release()
      host.destroy()
      element.remove()
      origin.remove()
    }
  }),
)

it.effect('keeps public layer composition identity stable for one default renderer', () =>
  Effect.sync(() => {
    const layer = createScatterPaintLayer<typeof Row.Type>()
    const renderer = motion<typeof Row.Type, Date, number>({ initial: false })
    expect(layer.compose(renderer)).toBe(layer.compose(renderer))
  }),
)

it.effect('paints exact inherited clip bounds without replacing the resolved Scene points', () =>
  Effect.sync(() => {
    const runtime = createChartRuntime<typeof Row.Type, Date, number>()
    const container = document.createElement('div')
    document.body.append(container)
    const layer = createScatterPaintLayer<typeof Row.Type>()
    const surface = layer.mount(container, () => {})

    try {
      const scene = runtime.render(
        drawing(true, 5, () => {}, true, false, rows, 0.004, 0.006),
        { width: 640, height: 320 },
      )
      const clip = { x: 1.234567, y: 2.345678, width: 300.456789, height: 200.567891 }
      const wrapped = {
        ...scene,
        nodes: [{ kind: 'group' as const, key: 'fractional-clip', clip, children: scene.nodes }],
      }
      surface.render(wrapped, { ariaLabel: 'Precise Scatter clip', idPrefix: 'clip-test' })
      const rectangle = surface.element.querySelector('.bkm-scatter-clips rect')
      expect(['x', 'y', 'width', 'height'].map((name) => rectangle?.getAttribute(name))).toEqual([
        '1.234567',
        '2.345678',
        '300.456789',
        '200.567891',
      ])
      expect(wrapped.points).toBe(scene.points)
      expect(scene.points.every((point) => rows.includes(point.datum))).toBe(true)
      expect(
        [...surface.element.querySelectorAll('circle[stroke-width]')].map((circle) =>
          circle.getAttribute('stroke-width'),
        ),
      ).toEqual(['0.006', '0.004', '0.006', '0.004'])
      expect(container.querySelector('canvas')).toBeNull()
    } finally {
      surface.destroy()
      runtime.destroy()
      container.remove()
    }
  }),
)

it.effect('omits the Scatter browser tooltip when no physical extension was acquired', () =>
  Effect.sync(() => {
    expect(drawing(true).tooltip).toBe(false)
  }),
)
