import type { MotionNodeOptions } from 'motion-dom'
import type { SankeyChartProps } from './props'
import type { SankeyNodeProps } from './carriers'
import type { SankeyHoverFocus } from './hover-css'
import { sankeyHoverSets } from './hover-css'
import { mountProgressOptions } from '../kit/motion/transition-options'
import { mountElementMotion } from './element-motion'

const readNode: (
  group: SVGGElement,
  root: HTMLElement,
  props: SankeyChartProps,
) => NodePose | null = function readNode(
  group: SVGGElement,
  root: HTMLElement,
  props: SankeyChartProps,
) {
  const match = /^sankey:sankey-node-(?<index>\d+)-role-(?<occurrence>\d+)$/u.exec(
    group.dataset.tsKey ?? '',
  )

  const index = Number(match?.groups?.index)
  const occurrence = Number(match?.groups?.occurrence)
  const role = props.children?.at(occurrence)
  const rect = group.querySelector<SVGRectElement>(':scope > rect')

  if (match === null || role?.role !== 'node' || rect === null) {
    return null
  }

  const svg = root.querySelector('svg')
  const width = svg?.viewBox.baseVal.width ?? root.clientWidth
  const leftMargin = props.margin?.left ?? 180
  const innerWidth = width - leftMargin - (props.margin?.right ?? 180)
  const x = numberAttr(rect, 'x')

  return {
    name: props.data.nodes.at(index)?.name ?? '',
    index,
    occurrence,
    x,
    y: numberAttr(rect, 'y'),
    width: numberAttr(rect, 'width'),
    height: numberAttr(rect, 'height'),
    left: x - leftMargin < innerWidth / 2,
    rect,
    role: role.props,
  }
}

type Apply = (
  element: SVGElement,
  key: string,
  initial: Record<string, number>,
  next: MotionNodeOptions & { readonly style?: { readonly originY: number } },
) => void

interface NodePose {
  readonly name: string
  readonly index: number
  readonly occurrence: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly left: boolean
  readonly rect: SVGRectElement
  readonly role: SankeyNodeProps
}

const numberAttr = (element: Element, name: string) => Number(element.getAttribute(name) ?? 0)

function labelLayout(node: NodePose, value: boolean) {
  const vertical = node.role.labelOrientation === 'vertical'
  const edge = node.left ? node.x - 12 : node.x + node.width + 12
  const initialX = node.left ? node.x + 8 : node.x + node.width - 8
  let localX = 0
  let rotate = 0
  let anchor = node.left ? 'end' : 'start'
  let y = node.y + node.height / 2

  if (vertical) {
    rotate = node.left ? -90 : 90
    anchor = 'middle'

    if (value) {
      localX = node.left ? -8 : 8
    } else if (node.role.showValueLabels !== false) {
      localX = node.left ? 8 : -8
    }
  } else if (value) {
    y += 16
  }

  return { edge, initialX, localX, rotate, anchor, y }
}

function paintLabel(
  root: HTMLElement,
  node: NodePose,
  kind: 'nlabel' | 'vlabel',
  opacity: number,
  transition: ReturnType<typeof mountProgressOptions>,
  delay: number,
  apply: Apply,
) {
  const key = `${kind}-role-${node.occurrence}-node-${node.index}`
  const label = root.querySelector<SVGGElement>(`g[data-ts-key='sankey:${key}']`)
  const text = label?.querySelector<SVGTextElement>(':scope > text')

  if (label === null || text === null || text === undefined) {
    return
  }

  const value = kind === 'vlabel'
  const layout = labelLayout(node, value)
  text.dataset.bkmOwnedMotion = ''
  text.classList.add('[animation:none]')
  text.classList.add('[transition:none]')
  text.setAttribute('x', String(layout.localX))
  text.setAttribute('y', '0')
  text.setAttribute('dy', '0.35em')
  text.setAttribute('fill', 'var(--bkm-foreground)')
  text.setAttribute('text-anchor', layout.anchor)

  for (const attr of ['dx', 'dominant-baseline', 'transform', 'opacity']) {
    text.removeAttribute(attr)
  }

  apply(
    label,
    `${key}:${node.name}`,
    { opacity: 0, x: layout.initialX, y: layout.y, rotate: layout.rotate },
    {
      animate: { opacity, x: layout.edge, y: layout.y, rotate: layout.rotate },
      transition: { ...transition, delay: delay + (value ? 0.06 : 0) },
    },
  )
}

function paintNode(
  root: HTMLElement,
  node: NodePose,
  props: SankeyChartProps,
  active: ReadonlySet<number> | null,
  apply: Apply,
) {
  const duration = props.animationDuration ?? 1100
  const faded = active !== null && !active.has(node.index)
  const opacity = faded ? (node.role.fadedOpacity ?? 0.4) : 1
  const delay = ((node.index / Math.max(1, props.data.nodes.length)) * duration * 0.24) / 1000
  const transition = mountProgressOptions(props.enterTransition)
  node.rect.classList.add('[animation:none]')
  node.rect.classList.add('[transition:none]')
  apply(
    node.rect,
    `rect:${node.occurrence}:${node.index}:${node.name}`,
    { opacity: 0, scaleY: 0 },
    {
      animate: { opacity, scaleY: 1 },
      style: { originY: 0.5 },
      transition: { ...transition, delay },
    },
  )

  const labelDelay = delay + (duration * 0.108) / 1000
  const valueOpacity = faded ? opacity * 0.8 : 0.6
  paintLabel(root, node, 'nlabel', opacity, transition, labelDelay, apply)
  paintLabel(root, node, 'vlabel', valueOpacity, transition, labelDelay, apply)
}

/** Original AnimatedNode/NodeLabel lifetimes, keyed by authored occurrence and semantic node. */
export function createNodeMotion(publish: () => void) {
  const visuals = new Map<string, ReturnType<typeof mountElementMotion>>()
  const owners = new WeakMap<SVGElement, string>()
  let root: HTMLElement | undefined
  let props: SankeyChartProps | undefined
  let focus: SankeyHoverFocus | null = null

  const sync = () => {
    if (root === undefined || props === undefined) {
      return
    }

    const seen = new Set<string>()
    const active = focus === null ? null : new Set(sankeyHoverSets(props.data.links, focus).nodes)

    const apply: Apply = (element, key, initial, next) => {
      seen.add(key)
      const owner = owners.get(element)

      if (owner !== undefined && owner !== key) {
        visuals.get(owner)?.destroy()
        visuals.delete(owner)
      }

      owners.set(element, key)
      const previous = visuals.get(key)

      if (previous?.element === element) {
        previous.update(next)
      } else {
        previous?.destroy()
        visuals.set(key, mountElementMotion(element, initial, next, publish))
      }
    }

    for (const group of root.querySelectorAll<SVGGElement>(
      "g[data-ts-key^='sankey:sankey-node-']",
    )) {
      const node = readNode(group, root, props)

      if (node !== null) {
        paintNode(root, node, props, active, apply)
      }
    }

    for (const [key, visual] of visuals) {
      if (!seen.has(key)) {
        visual.destroy()
        owners.delete(visual.element)
        visuals.delete(key)
      }
    }
  }

  return {
    sync(element: HTMLElement, next: SankeyChartProps) {
      root = element
      props = next
      sync()
    },
    hover(next: SankeyHoverFocus | null) {
      focus = next
      sync()
    },
    clear() {
      for (const visual of visuals.values()) {
        visual.destroy()
        owners.delete(visual.element)
      }

      visuals.clear()
      root = undefined
      props = undefined
    },
  }
}
