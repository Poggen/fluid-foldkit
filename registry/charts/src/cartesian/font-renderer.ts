import { createChartRuntime } from '@tanstack/charts'
import type {
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartRuntime,
  ChartValue,
} from '@tanstack/charts'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { cartesianFontMeasurement } from './font-measurement'

export const mountCartesianRenderer: <Row, X extends ChartValue, Y extends ChartValue>(
  container: HTMLElement,
  initialOptions: ChartRendererHostOptions<Row, X, Y>,
  resource: () => FontResource | undefined,
) => ChartRendererHost<Row, X, Y> = function mountCartesianRenderer<
  Row,
  X extends ChartValue,
  Y extends ChartValue,
>(
  container: HTMLElement,
  initialOptions: ChartRendererHostOptions<Row, X, Y>,
  resource: () => FontResource | undefined,
) {
  const view = container.ownerDocument.defaultView

  const measurement =
    initialOptions.measureText === undefined && resource()?.fontMetricsChanged !== undefined
      ? cartesianFontMeasurement(container)
      : undefined

  if (measurement === undefined || measurement === null || view === null) {
    return mountChartRenderer(container, initialOptions) satisfies ChartRendererHost<Row, X, Y>
  }

  const runtime = createChartRuntime<Row, X, Y>()
  let options = initialOptions
  let mayRetainTooltip = Boolean(initialOptions.definition.tooltip)
  let measureText = measurement.measure
  let epoch = 0
  let renderedEpoch = -1
  let checkedEpoch = -1
  let admission: ResizeObserver | undefined
  let frame = 0
  let destroyed = false
  let renderedResource: FontResource | undefined
  let capture: { available: boolean } | undefined

  const invalidateCapture = () => {
    if (capture !== undefined) capture.available = false
  }

  const withCapturedTypography = (available: boolean, run: () => void) => {
    const previous = capture
    invalidateCapture()
    const current = { available }
    capture = current

    try {
      run()
    } finally {
      current.available = false
      capture = previous
    }
  }

  const canReuseCapture = (next: ChartRendererHostOptions<Row, X, Y>) =>
    !mayRetainTooltip && next.definition.cursor === undefined

  const cancelFontWork = () => {
    admission?.disconnect()
    admission = undefined

    if (frame !== 0) {
      view.cancelAnimationFrame(frame)
      frame = 0
    }
  }

  const pending = () =>
    !destroyed &&
    options.measureText === undefined &&
    renderedEpoch !== epoch &&
    checkedEpoch !== epoch

  const wrapped: ChartRuntime<Row, X, Y> = {
    render: (definition, size, layout) => {
      const captured = capture?.available === true
      invalidateCapture()
      if (options.measureText !== undefined) {
        return runtime.render(definition, size, layout)
      }

      const currentResource = resource()
      if (!captured) measurement.refresh()
      measurement.begin()
      currentResource?.beginFontMetrics?.()

      const scene = runtime.render(definition, size, {
        ...layout,
        measureText,
        typography: measurement.typography(),
      })

      currentResource?.commitFontMetrics?.()
      measurement.commit()
      renderedEpoch = epoch
      renderedResource = currentResource
      cancelFontWork()

      return scene
    },
    destroy: () => {
      runtime.destroy()
    },
  }

  const host = mountChartRenderer(container, { ...options, measureText }, wrapped)

  const update = (next: ChartRendererHostOptions<Row, X, Y>) => {
    if (destroyed) {
      return
    }

    invalidateCapture()
    mayRetainTooltip ||= Boolean(next.definition.tooltip)
    const clearsPointer = options.definition.pointer !== false && next.definition.pointer === false
    const reusable = canReuseCapture(options) && canReuseCapture(next) && !clearsPointer
    const previousMeasurer = options.measureText
    options = next

    if (next.measureText !== undefined) {
      cancelFontWork()
      host.update(next)

      return
    }

    if (previousMeasurer !== undefined) {
      measurement.invalidate()
    }

    if (measurement.refresh() || previousMeasurer !== undefined) {
      measureText = (text, style) => measurement.measure(text, style)
    }

    withCapturedTypography(reusable, () => host.update({ ...next, measureText }))
  }

  const checkPending = () => {
    cancelFontWork()

    if (!pending()) {
      return
    }

    invalidateCapture()
    const checkingEpoch = epoch
    const current = resource()
    const resourceChanged =
      current !== renderedResource || current?.fontMetricsChanged?.() !== false

    const reusable = canReuseCapture(options)

    if (resourceChanged && reusable) measurement.refresh()

    if (resourceChanged || measurement.changed()) {
      measureText = (text, style) => measurement.measure(text, style)
      withCapturedTypography(reusable, () => host.update({ ...options, measureText }))
    } else {
      checkedEpoch = checkingEpoch
    }
  }

  const deferUntilObserved = () => {
    const Observer = view.ResizeObserver

    if (Observer === undefined) {
      return false
    }

    const observer = new Observer(() => {
      if (admission === observer) {
        checkPending()
      }
    })

    admission = observer
    observer.observe(container)

    return true
  }

  const { fonts } = container.ownerDocument

  const loaded = () => {
    if (destroyed || options.measureText !== undefined) {
      return
    }

    measurement.invalidate()
    epoch += 1

    if (frame !== 0 || admission !== undefined) {
      return
    }

    frame = view.requestAnimationFrame(() => {
      frame = 0

      if (pending() && !deferUntilObserved()) {
        checkPending()
      }
    })
  }

  fonts?.addEventListener('loadingdone', loaded)
  container.addEventListener('focusin', checkPending, true)

  return {
    ...host,
    update,
    destroy: () => {
      if (destroyed) {
        return
      }

      destroyed = true
      invalidateCapture()
      fonts?.removeEventListener('loadingdone', loaded)
      container.removeEventListener('focusin', checkPending, true)
      cancelFontWork()
      host.destroy()
    },
  } satisfies ChartRendererHost<Row, X, Y>
}

interface FontResource {
  readonly beginFontMetrics?: () => void
  readonly commitFontMetrics?: () => void
  readonly fontMetricsChanged?: (() => boolean) | undefined
}
