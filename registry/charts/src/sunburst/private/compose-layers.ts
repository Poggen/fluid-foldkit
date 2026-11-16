// Layer compositor for a mark-level `renderer`: stacks the host renderer's layers and the mark layers in scene order (UPSTREAM-GAPS #51: only the Canvas module exports one).
// Covers what ring and sunburst use: no custom focus-guide renderers.
import type {
  ChartLayerRenderer,
  ChartRenderer,
  ChartScene,
  ChartSurface,
  ChartSurfaceRenderOptions,
  RenderChartOptions,
  SceneNode,
} from '@tanstack/charts'

type Renderer = ChartRenderer<unknown, number, number>

type Surface = ChartSurface<unknown, number, number>

type Scene = ChartScene<unknown, number, number>

interface Layer {
  renderer: Renderer
  nodes: Array<SceneNode>
}

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Scene nodes grouped into consecutive runs by renderer; a group holding custom-rendered children is split, each run keeping the group wrapper. */
const splitLayers = (
  nodes: ReadonlyArray<SceneNode>,
  defaultRenderer: Renderer,
  customRenderer: ChartLayerRenderer<unknown, number, number>,
): { layers: Array<Layer>; custom: boolean } => {
  const layers: Array<Layer> = []
  let custom = false

  const append = (renderer: Renderer, next: Array<SceneNode>): void => {
    const previous = layers.at(-1)

    if (previous?.renderer === renderer) {
      previous.nodes.push(...next)
    } else {
      layers.push({ nodes: next, renderer })
    }
  }

  for (const node of nodes) {
    if (node.renderer !== undefined) {
      const renderer = node.renderer === customRenderer ? customRenderer : defaultRenderer
      custom ||= renderer !== defaultRenderer
      const { renderer: _renderer, ...clean } = node
      append(renderer, [clean])
    } else if (node.kind === 'group') {
      const inner = splitLayers(node.children, defaultRenderer, customRenderer)

      if (inner.custom) {
        custom = true

        for (const layer of inner.layers) {
          append(layer.renderer, [{ ...node, children: layer.nodes }])
        }
      } else {
        append(defaultRenderer, [node])
      }
    } else {
      append(defaultRenderer, [node])
    }
  }

  return { custom, layers }
}

/** The host layer first and last, so the host's focus guides and hit surface sit on top of the custom layers. */
const renderLayers = (
  scene: Scene,
  defaultRenderer: Renderer,
  customRenderer: ChartLayerRenderer<unknown, number, number>,
): Array<Layer & { guides?: Scene['focusGuides'] }> => {
  const layers: Array<Layer & { guides?: Scene['focusGuides'] }> = splitLayers(
    scene.nodes,
    defaultRenderer,
    customRenderer,
  ).layers

  if (layers[0]?.renderer !== defaultRenderer) {
    layers.unshift({ nodes: [], renderer: defaultRenderer })
  }

  if (layers.at(-1)?.renderer !== defaultRenderer) {
    layers.push({ nodes: [], renderer: defaultRenderer })
  }

  const top = layers.at(-1)

  if (top !== undefined && scene.focusGuides !== undefined && scene.focusGuides.length > 0) {
    top.guides = scene.focusGuides
  }

  return layers
}

const layerScene = (
  scene: Scene,
  layer: Layer & { guides?: Scene['focusGuides'] },
  index: number,
): Scene => {
  const { focusGuides: _guides, ...base } = scene

  return {
    ...base,
    ...(layer.guides === undefined ? {} : { focusGuides: layer.guides }),
    nodes: layer.nodes,
    theme: index === 0 ? scene.theme : { ...scene.theme, background: 'transparent' },
  }
}

const layerOptions = (
  options: ChartSurfaceRenderOptions,
  index: number,
  animate: boolean,
): ChartSurfaceRenderOptions => {
  const { animation, className: _className, ...base } = options

  return {
    ...base,
    ...(animate && animation !== undefined ? { animation } : {}),
    idPrefix: `${options.idPrefix ?? 'ts-chart'}-layer-${index}`,
    tabIndex: -1,
  }
}

const LAYER_CLASSES = 'ts-chart-layer absolute inset-0 w-full h-full pointer-events-none'

const ROOT_CLASSES = 'ts-chart ts-chart-layers block relative w-full h-full overflow-visible'

export const composeLayers = (
  defaultRenderer: Renderer,
  customRenderer: ChartLayerRenderer<unknown, number, number>,
): Renderer => {
  const renderer: Renderer = {
    ...(defaultRenderer.capabilities === undefined
      ? {}
      : { capabilities: defaultRenderer.capabilities }),
    id: `layers:${defaultRenderer.id}`,
    mount: (container, requestRender): Surface => {
      const root =
        container.querySelector<HTMLElement>(':scope > .ts-chart-layers') ??
        container.ownerDocument.createElement('div')

      if (root.parentElement !== container) {
        container.replaceChildren(root)
      }

      const listeners = new Set<
        Parameters<NonNullable<Surface['subscribePresentationPoints']>>[0]
      >()

      let mounted: Array<{ renderer: Renderer; surface: Surface }> = []
      let rendered: Array<Layer> = []
      let unsubscribe: (() => void) | undefined
      let current: Scene | undefined
      let destroyed = false

      const defaultSurface = (): Surface | undefined =>
        mounted.findLast((layer) => layer.renderer === defaultRenderer)?.surface

      const mountAll = (layers: Array<Layer>, adopt: boolean): void => {
        const existing = [...root.querySelectorAll<HTMLElement>(':scope > .ts-chart-layer')]
        const canAdopt = adopt && existing.length === layers.length

        if (!canAdopt) {
          root.replaceChildren()
        }

        mounted = layers.map((layer, index) => {
          let host = existing[index]

          if (!canAdopt || host === undefined) {
            host = container.ownerDocument.createElement('div')
            host.className = LAYER_CLASSES
            host.dataset.tsChartLayer = String(index)
            host.setAttribute('aria-hidden', 'true')
            root.append(host)
          }

          return { renderer: layer.renderer, surface: layer.renderer.mount(host, requestRender) }
        })
      }

      const surface: Surface = {
        clientToScene: (scene, clientX, clientY) => {
          const bounds = root.getBoundingClientRect()

          return bounds.width === 0 || bounds.height === 0
            ? null
            : {
                x: ((clientX - bounds.left) / bounds.width) * scene.width,
                y: ((clientY - bounds.top) / bounds.height) * scene.height,
              }
        },
        destroy: (): void => {
          if (destroyed) {
            return
          }

          destroyed = true
          unsubscribe?.()
          listeners.clear()

          for (const layer of mounted) {
            layer.surface.destroy()
          }

          mounted = []
        },
        get defaultElement() {
          return defaultSurface()?.defaultElement ?? defaultSurface()?.element ?? root
        },
        element: root,
        getPresentationPoints: () =>
          mounted
            .find((layer) => layer.renderer === customRenderer)
            ?.surface.getPresentationPoints?.() ?? defaultSurface()?.getPresentationPoints?.(),
        get layers() {
          return mounted.map((layer) => layer.surface)
        },
        paintFocus: (focus, pointer, cursor, options) => {
          if (current === undefined || destroyed) {
            return undefined
          }

          const nodes: Array<SceneNode> = []
          let presented = false
          mounted.forEach((layer, index) => {
            const result = layer.surface.paintFocus(focus, pointer, cursor, options)
            presented ||= result !== undefined
            nodes.push(...(result?.nodes ?? rendered[index]?.nodes ?? []))
          })

          return presented ? { ...current, nodes } : undefined
        },
        render: (scene, options): void => {
          if (destroyed) {
            return
          }

          root.className =
            options.className === undefined ? ROOT_CLASSES : `${ROOT_CLASSES} ${options.className}`
          root.setAttribute('role', 'img')
          root.setAttribute('aria-roledescription', 'chart')
          root.setAttribute('aria-label', options.ariaLabel)

          if (options.ariaDescription) {
            root.setAttribute('aria-description', options.ariaDescription)
          } else {
            root.removeAttribute('aria-description')
          }

          root.tabIndex = options.tabIndex ?? 0
          root.dataset.tsChartWidth = String(scene.width)
          root.dataset.tsChartHeight = String(scene.height)
          const next = renderLayers(scene, defaultRenderer, customRenderer)

          const reused =
            mounted.length === next.length &&
            mounted.every((layer, index) => layer.renderer === next[index]?.renderer)

          if (!reused) {
            const adopt = mounted.length === 0
            unsubscribe?.()

            for (const layer of mounted) {
              layer.surface.destroy()
            }

            mountAll(next, adopt)
            const releases = mounted.flatMap((layer) => {
              const release = layer.surface.subscribePresentationPoints?.((points) => {
                const presented =
                  mounted
                    .find((candidate) => candidate.renderer === customRenderer)
                    ?.surface.getPresentationPoints?.() ?? points
                for (const listener of listeners) listener(presented)
              })
              return release === undefined ? [] : [release]
            })
            unsubscribe = () => {
              for (const release of releases) release()
            }
          }

          mounted.forEach((layer, index) => {
            const nextLayer = next[index]

            if (nextLayer !== undefined)
              layer.surface.render(
                layerScene(scene, nextLayer, index),
                layerOptions(options, index, reused),
              )
          })
          rendered = next
          current = scene
        },
        renderer,
        subscribePresentationPoints: (listener) => {
          listeners.add(listener)

          return (): void => {
            listeners.delete(listener)
          }
        },
        supportsStateFocus: true,
      }

      return surface
    },
    prerender: (scene, options: RenderChartOptions): string => {
      const className = options.className ? `${ROOT_CLASSES} ${options.className}` : ROOT_CLASSES

      const description = options.ariaDescription
        ? ` aria-description="${escapeAttribute(options.ariaDescription)}"`
        : ''

      const layers = renderLayers(scene, defaultRenderer, customRenderer).map((layer, index) => {
        const { className: _className, ...baseOptions } = options

        const inner = layer.renderer.prerender(layerScene(scene, layer, index), {
          ...baseOptions,
          idPrefix: `${options.idPrefix ?? 'ts-chart'}-layer-${index}`,
          tabIndex: -1,
        })

        return `<div class="${LAYER_CLASSES}" data-ts-chart-layer="${index}" aria-hidden="true">${inner}</div>`
      })

      return `<div class="${escapeAttribute(className)}" role="img" aria-roledescription="chart" aria-label="${escapeAttribute(options.ariaLabel)}"${description} tabindex="${options.tabIndex ?? 0}" data-ts-chart-width="${Math.round(scene.width)}" data-ts-chart-height="${Math.round(scene.height)}">${layers.join('')}</div>`
    },
  }

  return renderer
}
