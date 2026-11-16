import type { RenderChartOptions, SceneGroup, SceneNode } from '@tanstack/charts'

const SVG_NS = 'http://www.w3.org/2000/svg'

const STATIC_ATTRIBUTES = [
  'class',
  'aria-hidden',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'opacity',
  'filter',
  'style',
] as const

interface PaintNode {
  readonly element: SVGElement
  readonly kind: 'group' | 'dot'
  readonly children: Map<string, PaintNode>
}

const opaqueId = (value: string): string =>
  Array.from(value, (unit) => unit.codePointAt(0)?.toString(16)).join('-')

const set = (element: Element, name: string, value: string | undefined): void => {
  if (value === undefined) {
    element.removeAttribute(name)
  } else {
    element.setAttribute(name, value)
  }
}

function staticAttributes(element: SVGElement, target: Element, preserveMotion: boolean): void {
  for (const name of STATIC_ATTRIBUTES) {
    if (preserveMotion && (name === 'opacity' || name === 'filter' || name === 'style')) {
      continue
    }

    set(element, name, target.getAttribute(name) ?? undefined)
  }
}

function groupClip(
  element: SVGElement,
  clips: SVGDefsElement,
  clip: SceneGroup['clip'],
  path: ReadonlyArray<string>,
  prefix: string,
): void {
  if (clip === undefined) {
    element.removeAttribute('clip-path')

    return
  }

  const document = element.ownerDocument
  const id = `bkm-scatter-clip-${opaqueId(JSON.stringify([prefix, path]))}`
  const definition = document.createElementNS(SVG_NS, 'clipPath')
  const rectangle = document.createElementNS(SVG_NS, 'rect')
  definition.setAttribute('id', id)
  definition.setAttribute('clipPathUnits', 'userSpaceOnUse')

  for (const name of ['x', 'y', 'width', 'height'] as const) {
    rectangle.setAttribute(name, String(clip[name]))
  }

  definition.append(rectangle)
  clips.append(definition)
  element.setAttribute('clip-path', `url(#${id})`)
}

/** Only the surface's own parent-local opaque Scene keys identify retained nodes. */
export function scatterLayerPainter(svg: SVGSVGElement) {
  const document = svg.ownerDocument
  const view = document.defaultView

  if (view === null) {
    throw new Error('A mounted Scatter surface requires its browser document')
  }

  const adopt = (parent: SVGElement): Map<string, PaintNode> => {
    const entries = new Map<string, PaintNode>()

    for (const element of parent.children) {
      const key = element.getAttribute('data-ts-key')

      if (!(element instanceof view.SVGElement) || key === null) {
        continue
      }

      if (element.localName === 'g' || element.localName === 'circle') {
        entries.set(key, {
          element,
          kind: element.localName === 'g' ? 'group' : 'dot',
          children: adopt(element),
        })
      }
    }

    return entries
  }

  const root =
    svg.querySelector<SVGGElement>(':scope > g.bkm-scatter-content') ??
    document.createElementNS(SVG_NS, 'g')
  root.setAttribute('class', 'bkm-scatter-content')
  root.setAttribute('data-ts-key', 'bkm-scatter-content')

  if (root.parentNode !== svg) {
    svg.append(root)
  }

  const resources =
    svg.querySelector<SVGDefsElement>(':scope > defs.bkm-scatter-resources') ??
    document.createElementNS(SVG_NS, 'defs')
  resources.setAttribute('class', 'bkm-scatter-resources')
  const clips = document.createElementNS(SVG_NS, 'defs')
  clips.setAttribute('class', 'bkm-scatter-clips')
  svg.prepend(resources, clips)

  for (const definition of svg.querySelectorAll('defs')) {
    if (definition !== resources && definition !== clips) {
      definition.remove()
    }
  }

  const entries = adopt(root)

  const update = (
    nodes: ReadonlyArray<SceneNode>,
    parent: SVGElement,
    previous: Map<string, PaintNode>,
    serialized: Element,
    path: ReadonlyArray<string>,
    prefix: string,
  ): void => {
    const active = new Set<string>()
    const serializedChildren = new Map(
      [...serialized.children].flatMap((element) => {
        const key = element.getAttribute('data-ts-key')

        return key === null ? [] : [[key, element] as const]
      }),
    )
    let cursor = parent.firstChild

    for (const node of nodes) {
      if (node.kind !== 'group' && node.kind !== 'dot') {
        throw new Error('The Scatter paint surface accepts only its resolved groups and dots')
      }

      const target = serializedChildren.get(node.key)

      if (target === undefined) {
        throw new Error('Public SVG serialization must retain the opaque Scatter Scene key')
      }

      active.add(node.key)
      let entry = previous.get(node.key)
      const retained = entry !== undefined && entry.kind === node.kind

      if (!retained || entry === undefined) {
        entry?.element.remove()
        entry = {
          element: document.createElementNS(SVG_NS, node.kind === 'group' ? 'g' : 'circle'),
          kind: node.kind,
          children: new Map(),
        }
        previous.set(node.key, entry)
      }

      const element = entry.element
      element.setAttribute('data-ts-key', node.key)
      const motionOwned = node.kind === 'group' && node.className === 'bkm-scatter-enter'

      staticAttributes(element, target, retained && motionOwned)

      for (const [property, attribute] of [
        ['strokeWidth', 'stroke-width'],
        ['strokeOpacity', 'stroke-opacity'],
        ['fillOpacity', 'fill-opacity'],
        ['opacity', 'opacity'],
      ] as const) {
        if (retained && motionOwned && property === 'opacity') {
          continue
        }

        const value = node.style?.[property]

        if (value !== undefined) {
          element.setAttribute(attribute, String(value))
        }
      }

      if (element !== cursor) {
        parent.insertBefore(element, cursor)
      }

      cursor = element.nextSibling
      const nextPath = [...path, node.key]

      if (node.kind === 'group') {
        const { translateX = 0, translateY = 0, clip } = node
        set(
          element,
          'transform',
          translateX === 0 && translateY === 0
            ? undefined
            : `translate(${translateX} ${translateY})`,
        )

        groupClip(element, clips, clip, nextPath, prefix)

        update(node.children, element, entry.children, target, nextPath, prefix)
      } else {
        element.setAttribute('cx', String(node.x))
        element.setAttribute('cy', String(node.y))
        element.setAttribute('r', String(node.radius))
      }
    }

    for (const [key, entry] of previous) {
      if (!active.has(key)) {
        entry.element.remove()
        previous.delete(key)
      }
    }
  }

  return {
    render: (nodes: ReadonlyArray<SceneNode>, markup: string, options: RenderChartOptions) => {
      const template = document.createElement('template')
      template.innerHTML = markup
      const serialized = template.content.querySelector('svg > g.bkm-scatter-content')

      if (serialized === null) {
        throw new Error('Scatter requires its public serialized SVG content')
      }

      resources.replaceChildren(
        ...[...template.content.querySelectorAll('defs')].flatMap((defs) =>
          [...defs.children]
            .filter((node) => node.localName !== 'clipPath')
            .map((node) => document.importNode(node, true)),
        ),
      )
      clips.replaceChildren()
      update(nodes, root, entries, serialized, [], options.idPrefix ?? 'scatter')
    },
    destroy: () => {
      entries.clear()
      svg.remove()
    },
  }
}
