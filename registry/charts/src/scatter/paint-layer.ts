import type {
  ChartLayerRenderer,
  ChartRenderer,
  ChartScene,
  RenderChartOptions,
} from '@tanstack/charts'
import { createCanvasChartRenderer } from '@tanstack/charts/canvas'
import { renderChartSvg } from '@tanstack/charts/svg'
import { scatterLayerPainter } from './layer-painter'

const markup: <Row>(scene: ChartScene<Row, Date, number>, options: RenderChartOptions) => string =
  function markup<Row>(scene: ChartScene<Row, Date, number>, options: RenderChartOptions) {
    return renderChartSvg(
      {
        ...scene,
        nodes: [
          {
            kind: 'group',
            key: 'bkm-scatter-content',
            className: 'bkm-scatter-content',
            children: scene.nodes,
          },
        ],
      },
      { ...options, className: `${options.className ?? ''} bkm-scatter-island` },
    ) satisfies string
  }

/** The published compositor selects these SVG surfaces; it never selects or mounts Canvas. */
export const createScatterPaintLayer: <Row>() => ChartLayerRenderer<Row, Date, number> =
  function createScatterPaintLayer<Row>() {
    const compositor = createCanvasChartRenderer<Row, Date, number>()
    const composed = new WeakMap<
      ChartRenderer<Row, Date, number>,
      ChartRenderer<Row, Date, number>
    >()
    const layer: ChartLayerRenderer<Row, Date, number> = {
      id: 'bklit-scatter-paint',
      kind: 'chart-layer-renderer',
      compose: (defaultRenderer) => {
        const previous = composed.get(defaultRenderer)

        if (previous !== undefined) {
          return previous
        }

        const base = compositor.compose(defaultRenderer)
        const renderer: ChartRenderer<Row, Date, number> = {
          ...base,
          mount: (container, requestRender) => {
            const surface = base.mount(container, requestRender)

            return {
              renderer,
              element: surface.element,
              get defaultElement() {
                return surface.defaultElement ?? surface.element
              },
              get layers() {
                return surface.layers ?? []
              },
              supportsStateFocus: true,
              clientToScene: (...args) => surface.clientToScene?.(...args) ?? null,
              getPresentationPoints: () => surface.getPresentationPoints?.(),
              subscribePresentationPoints: (listener) =>
                surface.subscribePresentationPoints?.(listener) ?? (() => {}),
              paintFocus: (...args) => surface.paintFocus(...args),
              destroy: surface.destroy,
              render: (scene, options) => {
                surface.render(scene, options)
                const view = container.ownerDocument.defaultView

                if (view !== null && surface.element instanceof view.HTMLElement) {
                  surface.element.classList.add('h-[var(--bkm-scatter-height)]')
                  surface.element.style.setProperty('--bkm-scatter-height', `${scene.height}px`)
                }
              },
            }
          },
        }

        composed.set(defaultRenderer, renderer)

        return renderer
      },
      prerender: markup,
      mount: (container) => {
        const document = container.ownerDocument
        const svg =
          container.querySelector<SVGSVGElement>(':scope > svg.bkm-scatter-island') ??
          document.createElementNS(SVG_NS, 'svg')
        svg.classList.add('bkm-scatter-island')
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('width', '100%')
        svg.setAttribute('height', '100%')
        svg.classList.add('block', 'overflow-visible', 'absolute', 'inset-0', 'w-full', 'h-full')

        if (svg.parentNode !== container) {
          container.replaceChildren(svg)
        }

        const painter = scatterLayerPainter(svg)

        return {
          renderer: layer,
          element: svg,
          supportsStateFocus: true,
          render: (scene, options) => {
            svg.setAttribute('viewBox', `0 0 ${scene.width} ${scene.height}`)
            painter.render(scene.nodes, markup(scene, options), options)
          },

          paintFocus: () => undefined,
          destroy: painter.destroy,
        }
      },
    }

    return layer satisfies ChartLayerRenderer<Row, Date, number>
  }

const SVG_NS = 'http://www.w3.org/2000/svg'
