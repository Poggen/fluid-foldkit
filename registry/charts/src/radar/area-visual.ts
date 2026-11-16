import { animateSingleValue, motionValue } from 'motion-dom'
import type { MotionNodeOptions } from 'motion-dom'
import { mountRadarVisual } from './motion-node'
import { mountProgressOptions } from '../kit/motion/transition-options'
import { radarAreaColor } from './area'
import type { RadarAreaProps } from './area'
import type { RadarChartProps } from './options'

const SVG_NS = 'http://www.w3.org/2000/svg'

const hoverStrokeWidth = (hovered: boolean) => (hovered ? 3 : 2)

const areaClasses =
  'cursor-pointer [&[data-static]]:[opacity:1] [&[data-static][data-muted]]:[opacity:0.3] [&[data-static]]:[transform:none] [&[data-static][data-hovered]]:[transform:scale(1.05)]'

/** One Source RadarArea occurrence: the polygon and its points share one opacity/hover-scale group. */
export function createRadarAreaVisual(
  initialProps: RadarChartProps,
  initialArea: RadarAreaProps,
  publish: () => void,
) {
  const element = document.createElementNS(SVG_NS, 'g')
  const path = document.createElementNS(SVG_NS, 'path')
  const progress = motionValue(0)
  let props = initialProps
  let area = initialArea
  let hovered: number | null = null
  let complete = initialProps.animate === false
  let lastDelay: number | undefined
  let lastKey: string | undefined
  let pathVisual: ReturnType<typeof mountRadarVisual> | undefined
  const circles = new Map<string, SVGCircleElement>()
  element.setAttribute('class', areaClasses)
  path.setAttribute(
    'class',
    '[stroke-linejoin:round] [fill:var(--bkm-radar-area-color)] [stroke:var(--bkm-radar-area-color)] [&[data-no-stroke]]:stroke-none [filter:none] [&[data-glow]]:[filter:drop-shadow(0_0_12px_var(--bkm-radar-area-color))] [&[data-complete]]:[fill-opacity:0.15] [&[data-complete][data-hovered]]:[fill-opacity:0.35] [&[data-complete]]:[stroke-width:2] [&[data-complete][data-hovered]:not([data-no-stroke])]:[stroke-width:3] [&[data-complete][data-no-stroke]]:[stroke-width:0]',
  )
  element.append(path)

  const groupProps = (): MotionNodeOptions => ({
    animate: {
      opacity: hovered !== null && hovered !== area.index ? 0.3 : 1,
      scale: hovered === area.index ? 1.05 : 1,
    },
    transition: {
      opacity: { duration: 0.15 },
      scale: { type: 'spring', stiffness: 400, damping: 25 },
    },
  })

  let groupVisual: ReturnType<typeof mountRadarVisual> | undefined

  const createGroupVisual = () =>
    mountRadarVisual(element, { opacity: props.animate === false ? 1 : 0, scale: 1 }, groupProps())

  const pathProps = (): MotionNodeOptions => ({
    animate: {
      fillOpacity: hovered === area.index ? 0.35 : 0.15,
      strokeWidth: area.showStroke === false ? 0 : hoverStrokeWidth(hovered === area.index),
    },
    transition: { fillOpacity: { duration: 0.2 }, strokeWidth: { duration: 0.2 } },
  })

  const paint = () => {
    const datum = props.data[area.index]
    const radius = ((props.size ?? 400) - (props.margin ?? 60) * 2) / 2
    const current = complete ? 1 : progress.get()

    const points = props.metrics.map((metric, index) => {
      const angle = (index * Math.PI * 2) / props.metrics.length - Math.PI / 2
      const distance = ((datum?.values[metric.key] ?? 0) / 100) * radius * current

      return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }
    })

    path.setAttribute(
      'd',
      points.length === 0
        ? ''
        : `M ${points.map((point) => `${point.x},${point.y}`).join(' L ')} Z`,
    )
    const color = radarAreaColor(area, props.data)
    path.style.setProperty('--bkm-radar-area-color', color)
    path.toggleAttribute('data-no-stroke', area.showStroke === false)
    path.toggleAttribute('data-glow', area.showGlow !== false && hovered === area.index)
    // Motion owns these attributes during entry; CSS takes over only after its visual unmounts.
    path.toggleAttribute('data-complete', complete)
    path.toggleAttribute('data-hovered', hovered === area.index)

    const seen = new Set<string>()

    for (const [index, metric] of props.metrics.entries()) {
      if (datum === undefined || area.showPoints === false) {
        break
      }

      const target = points[index]

      if (target === undefined) {
        continue
      }

      const key = `${metric.key.length}:${metric.key}:${index}`
      seen.add(key)
      let circle = circles.get(key)

      if (circle === undefined) {
        circle = document.createElementNS(SVG_NS, 'circle')
        circles.set(key, circle)
      }

      circle.setAttribute('cx', String(target.x))
      circle.setAttribute('cy', String(target.y))
      circle.setAttribute(
        'class',
        '[r:4px] [&[data-hovered]]:[r:6px] [fill:var(--bkm-radar-point-color)] [stroke:var(--chart-background)] [stroke-width:2]',
      )
      circle.toggleAttribute('data-hovered', hovered === area.index)
      circle.style.setProperty('--bkm-radar-point-color', color)
      element.append(circle)
    }

    for (const [key, circle] of circles) {
      if (!seen.has(key)) {
        circle.remove()
        circles.delete(key)
      }
    }
  }

  const release = progress.on('change', (value) => {
    if (!complete && value >= 1) {
      complete = true
      pathVisual?.destroy()
      pathVisual = undefined
    }

    paint()
    publish()
  })

  const configure = (nextProps: RadarChartProps, nextArea: RadarAreaProps) => {
    props = nextProps
    area = nextArea
    element.setAttribute('class', [areaClasses, area.className ?? ''].filter(Boolean).join(' '))
    element.toggleAttribute('data-static', props.animate === false)
    element.toggleAttribute('data-muted', hovered !== null && hovered !== area.index)
    element.toggleAttribute('data-hovered', hovered === area.index)
    if (props.animate === false) {
      progress.stop()
      complete = true
      progress.set(1)
      groupVisual?.destroy()
      groupVisual = undefined
      pathVisual?.destroy()
      pathVisual = undefined
      // Unmount retains the final Motion output; release it before static CSS takes ownership.
      element.style.removeProperty('opacity')
      element.style.removeProperty('transform')
    }

    paint()

    if (props.data[area.index] === undefined) {
      groupVisual?.destroy()
      groupVisual = undefined
      pathVisual?.destroy()
      pathVisual = undefined
      path.removeAttribute('fill-opacity')
      path.removeAttribute('stroke-width')
      element.remove()
    } else if (props.animate !== false) {
      groupVisual ??= createGroupVisual()
      groupVisual?.update(groupProps())

      if (!complete) {
        pathVisual ??= mountRadarVisual(path, {}, pathProps())
        pathVisual.update(pathProps())
      }
    }

    const factor = (props.enterDurationMs ?? 1100) / 1100
    const gridStagger = 0.08 * (props.staggerScale ?? 1) * factor

    const delay =
      ((props.levels ?? 5) * gridStagger + 0.2) * factor +
      area.index * 0.15 * (props.staggerScale ?? 1) * factor

    const key = `${props.motionReplayKey ?? ''}-${area.index}`

    if (lastDelay !== delay || lastKey !== key) {
      lastDelay = delay
      lastKey = key

      if (props.animate === false) {
        return
      }

      complete = false
      progress.stop()
      progress.set(0)

      animateSingleValue(progress, 1, {
        ...mountProgressOptions(props.enterTransition),
        delay,
      })
    }
  }

  configure(props, area)

  return {
    element,
    configure,
    progress: () => (complete ? 1 : progress.get()),
    hover(index: number | null) {
      hovered = index
      element.toggleAttribute('data-muted', hovered !== null && hovered !== area.index)
      element.toggleAttribute('data-hovered', hovered === area.index)

      groupVisual?.update(groupProps())

      if (!complete) {
        pathVisual?.update(pathProps())
      }

      paint()
    },
    destroy() {
      release()
      progress.destroy()
      pathVisual?.destroy()
      groupVisual?.destroy()
      element.remove()
    },
  }
}
