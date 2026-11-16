import type {
  ChartTooltipExtension,
  ChartTooltipExtensionContext,
  ChartTooltipExtensionInstance,
} from '@tanstack/charts/tooltip'
import type { ChartTooltipOptions, ChartValue } from '@tanstack/charts'
import { orderChartTooltipPoints, resolveChartTooltipAnchor } from '@tanstack/charts/tooltip/model'
import { createTooltipBoxResource } from './tooltip-box-resource'

/** Keeps native focus/anchor resolution; the shared Original tooltip owner controls motion. */
const nativeTooltipClasses =
  'absolute z-[50] max-w-none p-0 border-none rounded-none bg-transparent text-inherit shadow-none [font:inherit] pointer-events-none [overflow-wrap:anywhere] select-none data-[sticky=true]:pointer-events-auto data-[sticky=true]:select-text'

export function nativeTooltip(
  element: HTMLElement,
  horizontalBars: () => boolean = () => false,
  park: () => void = () => {},
): ChartTooltipExtension {
  return {
    id: 'bklit-native-tooltip',
    __chartExtensionType: 'tooltip',
    __chartTooltipHost: 'dom',
    create<Datum, X extends ChartValue, Y extends ChartValue>(
      context: ChartTooltipExtensionContext<Datum, X, Y>,
    ): ChartTooltipExtensionInstance<Datum, X, Y> {
      context.container.append(element)
      let options: ChartTooltipOptions<Datum, X, Y> = {}
      const resource = createTooltipBoxResource(element)

      element.classList.add(...nativeTooltipClasses.split(' '))
      element.setAttribute('role', 'status')
      element.setAttribute('aria-live', 'polite')
      element.hidden = true

      const hide = () => {
        resource.hide()
      }

      return {
        update: (next) => {
          options = next
        },
        paint: (next) => {
          element.hidden = false
          const points = orderChartTooltipPoints(next.points, next.scene, options.sort)

          let anchor = resolveChartTooltipAnchor(
            next.point,
            points,
            next.scene,
            next.pointer,
            options,
            next.focus,
          )

          if (horizontalBars()) {
            anchor = { x: Math.max(0, ...points.map((point) => point.x)), y: next.point.y }
          }

          element.dataset.sticky = String(next.pinned)
          const { motion } = options

          const geometry = {
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
          }

          resource.show(horizontalBars() ? geometry : { ...geometry, top: anchor.y })
        },
        hide,
        contains: (target) => target instanceof Node && element.contains(target),
        destroy: () => {
          resource.destroy()
          park()
        },
      }
    },
  }
}
