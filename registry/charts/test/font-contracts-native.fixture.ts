import { Cause, Deferred, Effect } from 'effect'
import { scaleLinear } from 'd3-scale'
import { text } from '@tanstack/charts'
import type { ChartRendererHostOptions, ChartTooltipExtension } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import { createChartCursor, cursorHost } from '@tanstack/charts/cursor'
import { cartesianFontMeasurement } from '../src/cartesian/font-measurement'
import { mountCartesianRenderer } from '../src/cartesian/font-renderer'
import { pillFontMeasurement } from '../src/cartesian/pill-font-measurement'

const parent = document.querySelector<HTMLElement>('#style-contract-root')
if (parent === null) throw new Error('Native font fixture root required')
const descriptor = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font')
if (descriptor === undefined || descriptor.set === undefined)
  throw new Error('Native Canvas font setter required')
const assignments: Array<{ context: CanvasRenderingContext2D; font: string }> = []
Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', {
  ...descriptor,
  set(this: CanvasRenderingContext2D, value: string) {
    if (descriptor.set === undefined) throw new Error('Native Canvas font setter required')
    descriptor.set.call(this, value)
    assignments.push({ context: this, font: this.font })
  },
})

const output = (id: string, value: object) => {
  const element = document.createElement('output')
  element.id = id
  element.textContent = JSON.stringify(value)
  parent.append(element)
}

const container = () => {
  const element = document.createElement('section')
  element.style.cssText = 'width:400px;height:240px;font-family:monospace;font-weight:400;'
  parent.append(element)
  return element
}

const options = {
  anchor: 'start',
  baseline: 'auto',
  direction: 'ltr',
  fontFamily: 'monospace',
  fontScale: 1,
  fontSize: 18,
  fontStretch: 'normal',
  fontStyle: 'normal',
  letterSpacing: 0,
} satisfies Parameters<NonNullable<ReturnType<typeof cartesianFontMeasurement>>['measure']>[1]

const metrics = () => {
  const element = container()
  const measurement = cartesianFontMeasurement(element)
  const canvas = document.createElement('canvas').getContext('2d')
  if (measurement === null || canvas === null) throw new Error('Actual Canvas measurement required')
  measurement.begin()
  const first = measurement.measure('MMMM WWWW', options)
  const cached = measurement.measure('MMMM WWWW', options)
  measurement.commit()
  canvas.font = '18px monospace'
  const native = canvas.measureText('MMMM WWWW')
  const expected = {
    x: -native.actualBoundingBoxLeft,
    y: -native.actualBoundingBoxAscent,
    width: native.actualBoundingBoxLeft + native.actualBoundingBoxRight,
    height: native.actualBoundingBoxAscent + native.actualBoundingBoxDescent,
  }
  const unchanged = measurement.changed()
  element.style.fontWeight = '700'
  const refreshed = measurement.refresh()
  measurement.begin()
  const weighted = measurement.measure('MMMM WWWW', options)
  measurement.commit()
  output('font-metrics', {
    first,
    expected,
    cached: cached === first,
    unchanged,
    refreshed,
    retired: weighted !== first,
  })
  element.remove()
}

const row = { x: 1, y: 2, label: 'MMMM WWWW' }
const create = (element: HTMLElement, onRender?: () => void) => {
  const fonts = pillFontMeasurement(element)
  const resource = {
    beginFontMetrics: fonts.begin,
    commitFontMetrics: fonts.commit,
    fontMetricsChanged: fonts.changed,
  }
  const configuration: ChartRendererHostOptions<typeof row, number, number> = {
    ariaLabel: 'Native font contract',
    width: 400,
    height: 240,
    renderer: motion({ initial: false }),
    definition: {
      scales: { x: { scale: scaleLinear() }, y: { scale: scaleLinear() } },
      marks: [text([row], { x: 'x', y: 'y', text: 'label' })],
    },
    ...(onRender === undefined ? {} : { onRender }),
  }
  const start = assignments.length
  const host = mountCartesianRenderer(element, configuration, () => resource)
  const context = assignments
    .slice(start)
    .find((entry) => entry.font.endsWith(' monospace'))?.context
  if (context === undefined) throw new Error('Actual chart Canvas context required')
  const take = () => {
    const current = assignments.filter((entry) => entry.context === context).at(-1)?.font
    assignments.length = 0
    return current
  }
  return { host, configuration, take }
}

const callbacks = () => {
  const element = container()
  const { host, configuration, take } = create(element)
  const controller = createChartCursor<number, number>()
  let retired = 0
  const ownedController = {
    ...controller,
    subscribe: (listener: Parameters<typeof controller.subscribe>[0]) => {
      element.style.fontFamily = 'serif'
      const release = controller.subscribe(listener)
      return () => {
        retired += 1
        element.style.fontFamily = 'monospace'
        release()
      }
    },
  }
  try {
    take()
    host.update({
      ...configuration,
      definition: {
        ...configuration.definition,
        cursor: { mode: 'free', use: cursorHost, controller: ownedController },
      },
    })
    const subscribed = take()
    host.update(configuration)
    const released = take()
    element.style.fontFamily = 'sans-serif'
    host.update({ ...configuration, ariaLabel: 'Later cursor-free update' })
    const later = take()
    let next: string | undefined
    const apply = () => {
      if (next !== undefined) {
        element.style.fontFamily = next
        next = undefined
      }
    }
    const tooltip: ChartTooltipExtension = {
      id: 'native-font-tooltip',
      __chartExtensionType: 'tooltip',
      __chartTooltipHost: 'dom',
      create: () => ({
        update: apply,
        hide: apply,
        destroy: apply,
        paint: () => {},
        contains: () => false,
      }),
    }
    const withTooltip = { ...configuration, definition: { ...configuration.definition, tooltip } }
    host.update(withTooltip)
    const point = host.getScene().points[0]
    if (point === undefined) throw new Error('Native focus point required')
    host.interaction.setControlledFocus(point)
    next = 'serif'
    host.update({ ...withTooltip, ariaLabel: 'Tooltip update' })
    const updatedTooltip = take()
    next = 'monospace'
    host.update(configuration)
    const removedTooltip = take()
    next = 'sans-serif'
    host.update({ ...configuration, ariaLabel: 'Retired tooltip callback' })
    const retiredTooltip = take()
    const focusPoint = host.getScene().points[0]
    if (focusPoint === undefined) throw new Error('Native pointer focus required')
    host.interaction.setControlledFocus(focusPoint)
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    let cleared = false
    host.update({
      ...configuration,
      definition: { ...configuration.definition, pointer: false },
      onFocusChange: (point) => {
        if (point === null) {
          cleared = true
          element.style.fontFamily = 'monospace'
        }
      },
    })
    output('font-callbacks', {
      subscribed,
      released,
      later,
      retired,
      updatedTooltip,
      removedTooltip,
      retiredTooltip,
      cleared,
      clearedFont: take(),
    })
  } finally {
    host.destroy()
    element.remove()
  }
}

const admission = Effect.gen(function* nativeFontAdmission() {
  const element = container()
  const face = new FontFace(
    'NativeFontContract',
    'url(/charts/geist-latin.woff2?font-contract=admission)',
  )
  document.fonts.add(face)
  element.style.fontFamily = 'NativeFontContract, monospace'
  let rendered = 0
  let notify: (() => void) | undefined
  const { host, take } = create(element, () => {
    rendered += 1
    notify?.()
  })
  const initial = host.getScene()
  const svg = element.querySelector('svg')
  const before = rendered
  try {
    const changed = yield* Deferred.make<undefined>()
    notify = () => {
      Deferred.doneUnsafe(changed, Effect.succeed(undefined))
    }
    yield* Effect.promise(face.load.bind(face))
    yield* Effect.promise(() => document.fonts.ready)
    yield* Deferred.await(changed)
    const after = host.getScene()
    output('font-admission', {
      loaded: face.status,
      rendered: rendered > before,
      freshScene: after !== initial,
      retainedSvg: element.querySelector('svg') === svg,
      nativeFont: take(),
    })
  } finally {
    notify = undefined
    host.destroy()
    document.fonts.delete(face)
    element.remove()
  }
})

const run = Effect.gen(function* nativeFontContracts() {
  metrics()
  callbacks()
  yield* admission
}).pipe(
  Effect.catchCause((cause) =>
    Effect.sync(() => output('font-error', { message: Cause.pretty(cause) })),
  ),
  Effect.ensuring(
    Effect.sync(() => {
      Object.defineProperty(CanvasRenderingContext2D.prototype, 'font', descriptor)
    }),
  ),
)

void Effect.runPromise(run)
