import { motionValue } from 'motion-dom'
import type { SceneLabel } from '@tanstack/charts'
import { SVG_NS, setOrRemove } from '../ring/svg-layer'
import { mountRadarVisual } from './motion-node'
import type { RadarMotionProps } from './motion-node'

export interface RadarLabelPosition {
  readonly x: number
  readonly y: number
}

export function createRadarLabelVisual(
  parent: SVGGElement,
  initial: SceneLabel,
  interactive: boolean,
  animate: boolean,
  delay: number,
  observe: (position: RadarLabelPosition) => void,
) {
  const element = document.createElementNS(SVG_NS, 'g')
  const text = document.createElementNS(SVG_NS, 'text')
  const x = motionValue(animate ? 0 : initial.x)
  const y = motionValue(animate ? 0 : initial.y)
  element.dataset.tsKey = initial.key
  element.append(text)
  parent.append(element)
  text.setAttribute('x', '0')
  text.setAttribute('y', '0')
  text.classList.add('pointer-events-auto')

  const position = () => {
    observe({ x: x.get(), y: y.get() })
  }

  const releaseX = x.on('change', position)
  const releaseY = y.on('change', position)

  const options: (node: SceneLabel) => RadarMotionProps = (node: SceneLabel) => ({
    style: { x, y },
    animate: { opacity: 1, x: node.x, y: node.y },
    transition: animate
      ? {
          opacity: { duration: 0.5, delay },
          x: { type: 'spring', stiffness: 80, damping: 15 },
          y: { type: 'spring', stiffness: 80, damping: 15 },
        }
      : { duration: 0 },
  })

  const paint = (node: SceneLabel, isInteractive: boolean) => {
    text.setAttribute('opacity', isInteractive ? '0.8' : '1')
    text.textContent = node.text
    setOrRemove(text, 'text-anchor', node.anchor)
    setOrRemove(text, 'dominant-baseline', node.baseline)
    setOrRemove(text, 'font-size', node.fontSize)
    setOrRemove(text, 'font-weight', node.fontWeight)
    setOrRemove(text, 'fill', node.style?.fill)
  }

  paint(initial, interactive)
  position()

  const visual = mountRadarVisual(
    element,
    { opacity: animate ? 0 : 1, x: x.get(), y: y.get() },
    options(initial),
    animate,
  )

  return {
    element,
    update(node: SceneLabel, isInteractive: boolean, shouldAnimate: boolean) {
      animate = shouldAnimate
      paint(node, isInteractive)
      visual.update(options(node), animate)
    },
    destroy() {
      releaseX()
      releaseY()
      visual.destroy()
      x.destroy()
      y.destroy()
      element.remove()
    },
  }
}
