import { createChartRuntime } from '@tanstack/charts'
import type {
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartRuntime,
  ChartValue,
} from '@tanstack/charts'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { cartesianFontMeasurement } from './font-measurement'

interface FontResource {
  readonly beginFontMetrics?: () => void
  readonly commitFontMetrics?: () => void
  readonly fontMetricsChanged?: (() => boolean) | undefined
}

export function mountCartesianRenderer<Row, X extends ChartValue, Y extends ChartValue>(
  container: HTMLElement,
  initialOptions: ChartRendererHostOptions<Row, X, Y>,
  resource: () => FontResource | undefined,
): ChartRendererHost<Row, X, Y> {
  const view = container.ownerDocument.defaultView

  const measurement =
    initialOptions.measureText === undefined && resource()?.fontMetricsChanged !== undefined
      ? cartesianFontMeasurement(container)
      : undefined

  if (measurement === undefined || measurement === null || view === null) {
    return mountChartRenderer(container, initialOptions)
  }

  const runtime = createChartRuntime<Row, X, Y>()
  let options = initialOptions
  let measureText = measurement.measure
  let epoch = 0
  let renderedEpoch = -1
  let checkedEpoch = -1
  let admission: ResizeObserver | undefined
  let frame = 0
  let destroyed = false
  let renderedResource: FontResource | undefined

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
      if (options.measureText !== undefined) {
        return runtime.render(definition, size, layout)
      }

      const currentResource = resource()
      measurement.refresh()
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

    host.update({ ...next, measureText })
  }

  const checkPending = () => {
    cancelFontWork()

    if (!pending()) {
      return
    }

    const checkingEpoch = epoch
    const current = resource()

    if (
      current !== renderedResource ||
      current?.fontMetricsChanged?.() !== false ||
      measurement.changed()
    ) {
      measureText = (text, style) => measurement.measure(text, style)
      host.update({ ...options, measureText })
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
      fonts?.removeEventListener('loadingdone', loaded)
      container.removeEventListener('focusin', checkPending, true)
      cancelFontWork()
      host.destroy()
    },
  }
}
