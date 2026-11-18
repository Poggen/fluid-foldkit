import type { SceneLabel, SceneStyle } from '@tanstack/charts'
import { setOrRemove, STYLE_PROPERTIES } from './private/svg-layer'

const applyStyle: (element: SVGElement, style: SceneStyle | undefined, scale: number) => void = (
  element: SVGElement,
  style: SceneStyle | undefined,
  scale: number,
) => {
  for (const [key, property] of STYLE_PROPERTIES) {
    const value = style?.[key]

    if (value === undefined) {
      element.removeAttribute(property)
    } else {
      element.setAttribute(property, String(key === 'strokeWidth' ? Number(value) * scale : value))
    }
  }
}

const paintLabel: (element: SVGElement, node: SceneLabel, scale: number) => void = (
  element: SVGElement,
  node: SceneLabel,
  scale: number,
) => {
  setOrRemove(element, 'class', node.className)
  setOrRemove(element, 'x', node.x)
  setOrRemove(element, 'y', node.y)
  setOrRemove(element, 'text-anchor', node.anchor)
  setOrRemove(element, 'dominant-baseline', node.baseline)
  setOrRemove(element, 'font-size', node.fontSize === undefined ? undefined : node.fontSize * scale)
  setOrRemove(element, 'font-weight', node.fontWeight)
  element.setAttribute('font-family', 'inherit')
  applyStyle(element, node.style, scale)

  if (element.textContent !== node.text) {
    element.textContent = node.text
  }
}

export { applyStyle, paintLabel }
