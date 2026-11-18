import type {
  ChartTooltipExtension,
  ChartTooltipExtensionContext,
  ChartTooltipExtensionInstance,
  ChartTooltipPaintContext,
} from '@tanstack/charts/tooltip'
import type {
  ChartPoint,
  ChartTooltipOptions,
  ChartTooltipPosition,
  ChartValue,
} from '@tanstack/charts'
import { orderChartTooltipPoints, resolveChartTooltipAnchor } from '@tanstack/charts/tooltip/model'
import { createTooltipBoxResource } from '../../cartesian/tooltip-box-resource'
import type { TooltipBoxGeometry } from '../../cartesian/tooltip-box-geometry'

export const nativeTooltip: (
  id: string,
  pointerAnchor?: boolean,
  bodyKey?: (point: TooltipBodyPoint) => string,
  requestedAnchor?: () => ChartTooltipPosition | null,
) => ChartTooltipExtension = function (
  id: string,
  pointerAnchor = true,
  bodyKey?: (point: TooltipBodyPoint) => string,
  requestedAnchor?: () => ChartTooltipPosition | null,
) {
  return {
    id: 'bklit-native-tooltip',
    __chartExtensionType: 'tooltip',
    __chartTooltipHost: 'dom',
    create<Datum, X extends ChartValue, Y extends ChartValue>(
      context: ChartTooltipExtensionContext<Datum, X, Y>,
    ) {
      const found = context.container.ownerDocument.querySelector(`#${CSS.escape(id)}`)

      if (!(found instanceof HTMLElement)) {
        throw new TypeError('Native tooltip requires its committed Foldkit body')
      }

      const element = found
      const body = element.querySelector<HTMLElement>('.ts-chart-tooltip__body')

      if (body === null) {
        throw new TypeError('Native tooltip requires its view-owned body')
      }

      const resource = createTooltipBoxResource(element)
      let options: ChartTooltipOptions<Datum, X, Y> = {}
      let pointer: { readonly x: number; readonly y: number } | null = null
      let pending: ChartTooltipPaintContext<Datum, X, Y> | undefined
      const document = element.ownerDocument

      const trackPointer = (event: PointerEvent) => {
        pointer = { x: Math.trunc(event.clientX), y: Math.trunc(event.clientY) }
      }

      if (pointerAnchor) {
        document.addEventListener('pointermove', trackPointer, true)
      }

      element.classList.add(...nativeTooltipClasses.split(' '))
      element.setAttribute('role', 'status')
      element.setAttribute('aria-live', 'polite')
      element.hidden = true

      const paintCommitted = () => {
        const next = pending

        if (next === undefined) {
          return
        }

        const expected = bodyKey?.(next.point)

        if (expected !== undefined && body.dataset.bkmTooltipBodyKey !== expected) {
          if (element.hasAttribute('hidden')) {
            element.classList.add('[visibility:hidden]')
          }

          return
        }

        const points = orderChartTooltipPoints(next.points, next.scene, options.sort)

        let anchor =
          requestedAnchor?.() ??
          resolveChartTooltipAnchor(
            next.point,
            points,
            next.scene,
            next.pointer,
            options,
            next.focus,
          )

        if (
          pointerAnchor &&
          pointer !== null &&
          next.pointer !== null &&
          next.pointer !== undefined
        ) {
          anchor = next.surface.clientToScene?.(next.scene, pointer.x, pointer.y) ?? anchor
        }

        element.className =
          options.className !== undefined && options.className !== ''
            ? `ts-chart-tooltip ${nativeTooltipClasses} ${options.className}`
            : `ts-chart-tooltip ${nativeTooltipClasses}`
        element.classList.add('[visibility:hidden]')
        element.dataset.sticky = String(next.pinned)
        resource.show(tooltipGeometry(options, next, anchor))
        element.classList.remove('[visibility:hidden]')
      }

      const observer = new MutationObserver(paintCommitted)
      observer.observe(body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-bkm-tooltip-body-key'],
      })

      return {
        update(next) {
          options = next
        },
        paint(next) {
          pending = next
          paintCommitted()
        },
        hide() {
          pending = undefined
          resource.hide()
        },
        contains: (target) => target instanceof Node && element.contains(target),
        destroy() {
          pending = undefined
          observer.disconnect()
          document.removeEventListener('pointermove', trackPointer, true)
          resource.destroy()
        },
      } satisfies ChartTooltipExtensionInstance<Datum, X, Y>
    },
  } satisfies ChartTooltipExtension
}

const tooltipGeometry: <Datum, X extends ChartValue, Y extends ChartValue>(
  options: ChartTooltipOptions<Datum, X, Y>,
  next: ChartTooltipPaintContext<Datum, X, Y>,
  anchor: ChartTooltipPosition,
) => TooltipBoxGeometry = function tooltipGeometry<
  Datum,
  X extends ChartValue,
  Y extends ChartValue,
>(
  options: ChartTooltipOptions<Datum, X, Y>,
  next: ChartTooltipPaintContext<Datum, X, Y>,
  anchor: ChartTooltipPosition,
) {
  const { motion } = options

  return {
    x: anchor.x,
    y: anchor.y,
    containerWidth: next.scene.width,
    containerHeight: next.scene.height,
    offset: options.offset ?? 16,
    animate: motion !== false && !(motion?.type === 'tween' && motion.duration === 0),
    springConfig:
      motion !== false && motion !== undefined && motion.type === 'spring'
        ? { stiffness: motion.stiffness ?? 100, damping: motion.damping ?? 20 }
        : { stiffness: 100, damping: 20 },
  } satisfies TooltipBoxGeometry
}

export type TooltipBodyPoint = Pick<ChartPoint, 'markId' | 'datum' | 'datumIndex'>

const nativeTooltipClasses =
  'absolute z-[50] max-w-none p-0 border-none rounded-none bg-transparent text-inherit shadow-none [font:inherit] pointer-events-none [overflow-wrap:anywhere] select-none data-[sticky=true]:pointer-events-auto data-[sticky=true]:select-text'
