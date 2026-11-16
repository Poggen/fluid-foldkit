import type {
  ChartTooltipExtension,
  ChartTooltipExtensionContext,
  ChartTooltipExtensionInstance,
  ChartTooltipPaintContext,
} from '@tanstack/charts/tooltip'
import type { ChartTooltipOptions, ChartTooltipPosition, ChartValue } from '@tanstack/charts'
import { orderChartTooltipPoints, resolveChartTooltipAnchor } from '@tanstack/charts/tooltip/model'
import { familyTooltipPlacement } from './placement'

/** Uses the pinned renderer's motion controller and anchor algorithms with a view-owned body. */
const nativeTooltipClasses =
  'absolute z-[1] max-w-none p-0 border-none rounded-none bg-transparent text-inherit shadow-none [font:inherit] pointer-events-none [overflow-wrap:anywhere] select-none data-[sticky=true]:pointer-events-auto data-[sticky=true]:select-text bottom-auto m-0 right-auto w-max left-[var(--bkm-tooltip-left)] top-[var(--bkm-tooltip-top)]'

export function liveTooltip(
  id: string,
  lifecycle: {
    readonly holdMs?: number
    readonly notifyBody?: boolean
    readonly placement?: 'live' | 'heatmap'
    readonly bottomInset?: number
  } = {},
): ChartTooltipExtension {
  return {
    id: 'bklit-native-tooltip',
    __chartExtensionType: 'tooltip',
    __chartTooltipHost: 'dom',
    create<Datum, X extends ChartValue, Y extends ChartValue>(
      context: ChartTooltipExtensionContext<Datum, X, Y>,
    ): ChartTooltipExtensionInstance<Datum, X, Y> {
      const found = context.container.ownerDocument.getElementById(id)

      if (!(found instanceof HTMLElement))
        throw new TypeError('Native tooltip requires its committed Foldkit body')
      const element = found
      const view = element.ownerDocument.defaultView
      let options: ChartTooltipOptions<Datum, X, Y> = {}
      let painted: ChartTooltipPaintContext<Datum, X, Y> | undefined
      let anchor: ChartTooltipPosition | null = null
      let frame: number | undefined
      let hideTimer: number | undefined

      const position = () => {
        if (painted === undefined || anchor === null) return
        portal.position({
          scene: painted.scene,
          surface: painted.surface,
          anchor,
          ...(options.placement === undefined ? {} : { placement: options.placement }),
          ...(options.offset === undefined ? {} : { offset: options.offset }),
        })
      }

      const schedulePosition = () => {
        if (painted === undefined || anchor === null || frame !== undefined) return
        frame = view?.requestAnimationFrame(() => {
          frame = undefined
          position()
        })
      }

      const portal = familyTooltipPlacement(
        lifecycle.placement ?? 'live',
        lifecycle.bottomInset ?? 0,
      ).create({ container: context.container, element, schedulePosition }, {})

      const observer =
        view?.ResizeObserver === undefined ? undefined : new view.ResizeObserver(schedulePosition)

      observer?.observe(element)
      element.classList.add(...nativeTooltipClasses.split(' '))
      element.setAttribute('role', 'status')
      element.setAttribute('aria-live', 'polite')
      element.hidden = true

      const hideNow = () => {
        painted = undefined
        anchor = null

        if (lifecycle.notifyBody !== false) context.bodyChange()?.(null)
        portal.hide?.()
        element.hidden = true
      }

      return {
        update: (next) => {
          options = next
        },
        paint: (next) => {
          if (hideTimer !== undefined) view?.clearTimeout(hideTimer)
          hideTimer = undefined
          painted = next
          const snapshot = context.motion?.beforePaint(element)
          element.hidden = false
          element.className = options.className
            ? `ts-chart-tooltip ${nativeTooltipClasses} ${options.className}`
            : `ts-chart-tooltip ${nativeTooltipClasses}`
          element.classList.add('[visibility:hidden]')
          const points = orderChartTooltipPoints(next.points, next.scene, options.sort)

          if (lifecycle.notifyBody !== false)
            context.bodyChange()?.({
              element,
              points,
              primaryPoint: next.point,
              pinned: next.pinned,
              dismiss: context.dismiss,
              content: { rows: [] },
            })
          anchor = resolveChartTooltipAnchor(
            next.point,
            points,
            next.scene,
            next.pointer,
            options,
            next.focus,
          )
          element.dataset.sticky = String(next.pinned)
          position()
          element.classList.remove('[visibility:hidden]')

          if (snapshot !== undefined) context.motion?.afterPaint(element, snapshot, options.motion)
        },
        hide: () => {
          if (hideTimer !== undefined) return

          if ((lifecycle.holdMs ?? 0) > 0 && view !== null)
            hideTimer = view?.setTimeout(() => {
              hideTimer = undefined
              hideNow()
            }, lifecycle.holdMs)
          else hideNow()
        },
        contains: (target) => target instanceof Node && element.contains(target),
        destroy: () => {
          if (hideTimer !== undefined) view?.clearTimeout(hideTimer)
          hideNow()
          observer?.disconnect()
          portal.destroy()

          if (frame !== undefined) view?.cancelAnimationFrame(frame)
          context.motion?.destroy(element)
        },
      }
    },
  }
}
