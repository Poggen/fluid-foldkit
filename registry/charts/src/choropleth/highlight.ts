/* @license Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT. */

const SVG_NS = 'http://www.w3.org/2000/svg'

interface GeoNode {
  readonly kind: string
  readonly key: string
  readonly path?: string
  readonly style?: import('@tanstack/charts').SceneStyle
  readonly children?: ReadonlyArray<GeoNode>
}

interface Scene {
  readonly nodes: ReadonlyArray<GeoNode>
}

const nodeIndex: (scene: Scene, prefix: string) => Map<string, GeoNode> = (
  scene: Scene,
  prefix: string,
) => {
  const index = new Map<string, GeoNode>()

  const walk: (nodes: ReadonlyArray<GeoNode>) => void = (nodes: ReadonlyArray<GeoNode>) => {
    for (const node of nodes) {
      const children = node.kind === 'group' ? node.children : undefined

      if (children) {
        walk(children)
      }

      if (!children && node.key.startsWith(prefix) && node.path !== undefined) {
        index.set(node.key, node)
      }
    }
  }

  walk(scene.nodes)

  return index
}

/** The highlight path of one choropleth host: `show` on a focused feature, `hide` off one, `refresh` after each render (a pan, zoom or resize moves the path). */
export class FeatureHighlight {
  private el: { readonly root: SVGSVGElement; readonly path: SVGPathElement } | null = null
  private key: string | null = null

  private readonly markId: string
  constructor(markId: string) {
    this.markId = markId
  }

  /** Built on first client use: the highlight is created during render, which also runs on the server. */
  get root() {
    return this.built().root satisfies SVGSVGElement
  }

  private built() {
    if (this.el) {
      return this.el satisfies { readonly root: SVGSVGElement; readonly path: SVGPathElement }
    }

    const root = document.createElementNS(SVG_NS, 'svg')
    root.setAttribute('aria-hidden', 'true')
    root.setAttribute('class', 'bkm-choro-hl')
    const layer = document.createElementNS(SVG_NS, 'g')
    layer.setAttribute('class', 'bkm-choro-hl-layer')
    const path = document.createElementNS(SVG_NS, 'path')
    layer.append(path)
    root.append(layer)
    root.classList.add('hidden')
    this.el = { path, root }

    return this.el satisfies { readonly root: SVGSVGElement; readonly path: SVGPathElement }
  }

  show(scene: Scene, key: string) {
    this.key = key
    this.write(scene)
  }

  hide() {
    this.key = null

    if (this.el) {
      this.el.root.classList.add('hidden')
    }
  }

  refresh(scene: Scene) {
    if (this.key !== null) {
      this.write(scene)
    }
  }

  private write(scene: Scene) {
    const node = this.key === null ? undefined : nodeIndex(scene, `${this.markId}:`).get(this.key)
    const { path, root } = this.built()

    if (!node?.path) {
      root.classList.add('hidden')

      return
    }

    path.setAttribute('d', node.path)
    const style = node.style ?? {}

    path.style.setProperty('--bkm-choro-highlight-fill', String(style.fill ?? 'none'))
    path.style.setProperty('--bkm-choro-highlight-stroke', String(style.stroke ?? 'none'))
    path.style.setProperty('--bkm-choro-highlight-stroke-width', String(style.strokeWidth ?? 1))
    path.setAttribute(
      'class',
      '[fill:var(--bkm-choro-highlight-fill)] [stroke:var(--bkm-choro-highlight-stroke)] [stroke-width:var(--bkm-choro-highlight-stroke-width)] [stroke-linejoin:round]',
    )
    root.classList.remove('hidden')
  }
}
