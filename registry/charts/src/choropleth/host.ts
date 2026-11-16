import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import type {
  ChartRendererHost,
  ChartPoint,
  ChartScene,
  ChartInteractionController,
} from '@tanstack/charts'
import { createGeoGeometry } from './focus'
import type { ProjectionHolder } from './focus'
import { FeatureHighlight } from './highlight'
import { createFeatureEntrance } from './feature-entrance'
import { createDefinition } from './definition'
import { resourceElement, scopePatterns } from './resources'
import type {
  ChoroplethChartProps,
  ChoroplethFeature,
  ChoroplethFeatureProps,
  ChoroplethTooltipProps,
  ChoroplethGraticuleProps,
} from './types'
import { mountGeoZoom, identityMatrix } from './zoom'
import { createKeyboardHold } from '../kit/interaction/keyboard-hold'
import { mountTapFocus } from '../kit/interaction/tap-focus'
import type { State, Observation, Inputs, Host } from './block'
import { ratio } from '../sankey/host'

const renderer = motion({ initial: 'always', respectReducedMotion: true })

export function choroplethPlan(props: ChoroplethChartProps) {
  let feature: ChoroplethFeatureProps | undefined,
    tooltip: ChoroplethTooltipProps | undefined,
    graticule: ChoroplethGraticuleProps | undefined

  for (const child of props.children)
    switch (child.role) {
      case 'feature':
        feature = child.props
        break
      case 'graticule':
        graticule = child.props
        break
      case 'tooltip':
        tooltip = child.props
        break
    }

  return {
    feature,
    tooltip,
    graticule,
    margin: { top: 0, left: 0, right: 0, bottom: 0, ...props.margin },
  }
}

export class ChoroplethHost implements Host {
  readonly root = document.createElement('div')
  readonly #surface = document.createElement('div')
  readonly #holder: ProjectionHolder = { projection: undefined, transform: { k: 1, x: 0, y: 0 } }
  readonly #geometry = createGeoGeometry(this.#holder)
  readonly #highlight = new FeatureHighlight('choropleth')
  readonly #observe: (event: Observation) => void
  #props: ChoroplethChartProps
  #state: State
  #chart: ChartRendererHost<ChoroplethFeature, number, number> | undefined
  #interaction: ChartInteractionController<ChoroplethFeature, number, number> | undefined
  #scene: ChartScene<ChoroplethFeature, number, number> | undefined
  #hold: ReturnType<typeof createKeyboardHold<ChoroplethFeature, number, number>> | undefined
  #tap: (() => void) | undefined
  #freeze: (() => void) | undefined
  #zoom: ReturnType<typeof mountGeoZoom> | undefined
  #readyTimer = 0
  readonly #entrance = createFeatureEntrance((value) =>
    this.root.toggleAttribute('data-bkm-feature-static', value),
  )
  #wheelFrame = 0
  #reveal = ''
  #resourceSvg: SVGSVGElement | undefined
  constructor(
    element: HTMLElement,
    state: State,
    props: ChoroplethChartProps,
    observe: (event: Observation) => void,
  ) {
    this.#state = state
    this.#props = props
    this.#observe = observe
    element.replaceChildren(this.root)
    this.#mount()
  }
  #mount() {
    this.root.dataset.bkmChart = 'choropleth'
    this.root.dataset.slot = 'chart'
    this.root.replaceChildren(this.#surface, this.#highlight.root)
    this.#style()
    const initial = this.#props.initialZoom ?? identityMatrix()
    this.#holder.transform = { k: initial.scaleX, x: initial.translateX, y: initial.translateY }
    this.#writeTransform()
    this.#hold = createKeyboardHold(this.root, () => this.#interaction)
    this.#tap = mountTapFocus(this.root, () => this.#interaction, 'tap')
    this.#mountZoom()
    this.#chart = mountChartRenderer(this.#surface, this.#options())
    this.#reveal = `${this.#props.animationDuration ?? 800}|${this.#props.revealSignature ?? ''}`
    this.#armReady()
  }
  #style() {
    const plan = choroplethPlan(this.#props)
    this.root.className = `relative w-full overflow-hidden [contain:layout_style_paint] [aspect-ratio:var(--bkm-choro-aspect)] data-bkm-zoom-enabled:cursor-grab data-bkm-zoom-enabled:touch-none ${this.#props.className ?? ''}`
    this.root.toggleAttribute('data-bkm-zoom-enabled', this.#props.zoomEnabled === true)
    this.root.style.setProperty(
      '--bkm-choro-aspect',
      String(ratio(this.#props.aspectRatio ?? '16 / 9')),
    )
    this.root.style.setProperty('--bkm-choro-dim', String(plan.feature?.fadedOpacity ?? 0.4))

    this.#resourceSvg?.remove()
    this.#resourceSvg = undefined

    if (plan.feature?.patterns !== undefined) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
        defs = document.createElementNS(svg.namespaceURI, 'defs')

      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('class', 'h-0 absolute w-0')
      defs.append(
        ...scopePatterns(plan.feature.patterns, `${this.#state.id}-`).map(resourceElement),
      )
      svg.append(defs)
      this.#resourceSvg = svg
      this.root.append(svg)
    }
  }
  #mountZoom() {
    const initial = this.#props.initialZoom ?? identityMatrix()
    this.#freeze = this.#props.zoomEnabled
      ? mountMouseFreeze(this.root, () => this.#interaction)
      : undefined

    if (this.#props.zoomEnabled)
      this.#zoom = mountGeoZoom({
        enabled: true,
        host: this.root,
        holder: this.#holder,
        initial,
        min: this.#props.zoomMin ?? 0.5,
        max: this.#props.zoomMax ?? 4,
        observe: (matrix, dragging) => {
          this.root.toggleAttribute('data-bkm-drag', dragging)
          this.#observe({
            _tag: 'ObservedTransform',
            scale: matrix.scaleX,
            x: matrix.translateX,
            y: matrix.translateY,
            dragging,
          })

          if (this.#state.hoveredIndex !== null) {
            const feature = this.#props.data.features.at(this.#state.hoveredIndex)

            if (feature !== undefined && !this.#geometry.visible(feature))
              this.#interaction?.setControlledFocus(null)
          }
        },
        onWheelZoom: (x, y) => {
          if (this.#state.hoveredIndex === null || this.#hold?.isHeld()) return
          cancelAnimationFrame(this.#wheelFrame)
          this.#wheelFrame = requestAnimationFrame(() => {
            this.#wheelFrame = 0
            const under = this.#interaction?.resolvePointer(x, y)

            if (
              under?.point.markId === 'choropleth' &&
              under.point.datumIndex === this.#state.hoveredIndex
            )
              return
            this.#interaction?.setControlledFocus(null, { source: 'pointer' })
          })
        },
      })
  }
  #armReady() {
    const view = this.root.ownerDocument.defaultView
    view?.clearTimeout(this.#readyTimer)
    this.root.removeAttribute('data-bkm-ready')
    this.#entrance.start(this.#props)

    const ready = () => {
      this.#entrance.finish()
      this.root.setAttribute('data-bkm-ready', '')
      this.#observe({ _tag: 'ObservedEntered' })
    }

    if ((this.#props.animationDuration ?? 800) <= 0) ready()
    else this.#readyTimer = view?.setTimeout(ready, this.#props.animationDuration ?? 800) ?? 0
  }

  #writeTransform() {
    const { k, x, y } = this.#holder.transform
    this.root.style.setProperty('--bkm-zk', String(k))
    this.root.style.setProperty('--bkm-zx', `${x}px`)
    this.root.style.setProperty('--bkm-zy', `${y}px`)
  }
  #options() {
    const { feature, tooltip, graticule, margin } = choroplethPlan(this.#props)

    return {
      idPrefix: this.#state.id,
      renderer,
      definition: createDefinition({
        tooltipId: `${this.#state.id}-tooltip`,
        data: this.#props.data,
        margin,
        center: this.#props.center ?? [0, 20],
        scale: this.#props.scale,
        translate: this.#props.translate,
        holder: this.#holder,
        geometry: this.#geometry,
        patternPrefix: `${this.#state.id}-`,
        featureConfig: feature,
        graticuleConfig: graticule,
        tooltipConfig: tooltip,
      }),
      aspectRatio: ratio(this.#props.aspectRatio ?? '16 / 9'),
      ariaLabel: this.#props.ariaLabel ?? 'Choropleth chart',
      ...(this.#props.ariaDescription === undefined
        ? {}
        : { ariaDescription: this.#props.ariaDescription }),
      onRender: ({
        scene,
        interaction,
      }: {
        scene: ChartScene<ChoroplethFeature, number, number>
        interaction: ChartInteractionController<ChoroplethFeature, number, number>
      }) => {
        this.#entrance.sync(this.#surface)
        this.#scene = scene
        this.#interaction = interaction
        this.#holder.renderedPoints = scene.points
        this.#highlight.refresh(scene)

        if (
          Math.abs(this.#state.width - scene.width) > 0.5 ||
          Math.abs(this.#state.height - scene.height) > 0.5
        )
          this.#observe({ _tag: 'ObservedSize', width: scene.width, height: scene.height })
      },
      onFocusChange: (point: ChartPoint<ChoroplethFeature, number, number> | null) => {
        this.#hold?.onFocus(point)
        const feature = point?.markId === 'choropleth'
        this.root.toggleAttribute('data-bkm-idle', !feature)
        this.root.toggleAttribute('data-hover', feature)

        if (!feature) this.#highlight.hide()
        else if (this.#scene !== undefined) this.#highlight.show(this.#scene, point.key)
        this.#observe({ _tag: 'ObservedHover', index: feature ? point.datumIndex : null })
      },
    }
  }
  configure(props: ChoroplethChartProps) {
    if (props === this.#props) return

    const previous = this.#props,
      unchanged = sameChoroplethDrawing(previous, props)

    const replay =
      this.#reveal !== `${props.animationDuration ?? 800}|${props.revealSignature ?? ''}`

    const zoomChanged =
      previous.zoomEnabled !== props.zoomEnabled ||
      previous.zoomMin !== props.zoomMin ||
      previous.zoomMax !== props.zoomMax

    this.#props = props
    this.root.className = `relative w-full overflow-hidden [contain:layout_style_paint] [aspect-ratio:var(--bkm-choro-aspect)] data-bkm-zoom-enabled:cursor-grab data-bkm-zoom-enabled:touch-none ${props.className ?? ''}`

    if (!unchanged || replay || zoomChanged) this.#style()

    if (!unchanged) this.#chart?.update(this.#options())

    if (zoomChanged) {
      this.#freeze?.()
      this.#zoom?.destroy()
      this.#freeze = undefined
      this.#zoom = undefined
      this.#mountZoom()
    }

    if (replay) {
      this.#reveal = `${props.animationDuration ?? 800}|${props.revealSignature ?? ''}`
      this.#observe({ _tag: 'ObservedReplay' })
      this.#armReady()
    }
  }
  update(state: State, inputs: Inputs) {
    const prev = this.#state
    this.#state = state
    inputs.configure(this)

    if (
      this.#holder.transform.k !== state.scale ||
      this.#holder.transform.x !== state.translateX ||
      this.#holder.transform.y !== state.translateY
    ) {
      this.#holder.transform = { k: state.scale, x: state.translateX, y: state.translateY }
      this.#writeTransform()
      this.#zoom?.set({ k: state.scale, x: state.translateX, y: state.translateY })
    }

    if (prev.hoverRevision !== state.hoverRevision) {
      const point =
        state.hoveredIndex === null
          ? null
          : this.#scene?.points.find(
              (point) => point.markId === 'choropleth' && point.datumIndex === state.hoveredIndex,
            )

      if (point !== undefined)
        this.#interaction?.setControlledFocus(point, { source: 'programmatic' })
    }
  }
  #release() {
    this.#entrance.clear()
    this.#chart?.destroy()
    this.#hold?.destroy()
    this.#tap?.()
    this.#freeze?.()
    this.#zoom?.destroy()
    this.root.ownerDocument.defaultView?.clearTimeout(this.#readyTimer)
    cancelAnimationFrame(this.#wheelFrame)
  }
  destroy() {
    this.#release()
    this.root.remove()
  }
}

function mountMouseFreeze(
  element: HTMLElement,
  get: () => ChartInteractionController<ChoroplethFeature, number, number> | undefined,
): () => void {
  let pressed = false

  const down = (event: PointerEvent) => {
    pressed = event.button === 0 && event.pointerType === 'mouse'
  }

  const move = (event: PointerEvent) => {
    if (pressed && event.pointerType === 'mouse') event.stopPropagation()
  }

  const up = (event: PointerEvent) => {
    if (!pressed) return
    pressed = false
    const interaction = get()

    if (interaction && event.target instanceof Node && element.contains(event.target))
      interaction.setControlledFocus(interaction.resolvePointer(event.clientX, event.clientY), {
        source: 'pointer',
      })
  }

  const cancel = () => {
      pressed = false
    },
    view = element.ownerDocument.defaultView

  element.addEventListener('pointerdown', down, true)
  element.addEventListener('pointermove', move, true)
  view?.addEventListener('pointerup', up, true)
  view?.addEventListener('pointercancel', cancel, true)

  return () => {
    element.removeEventListener('pointerdown', down, true)
    element.removeEventListener('pointermove', move, true)
    view?.removeEventListener('pointerup', up, true)
    view?.removeEventListener('pointercancel', cancel, true)
  }
}

function sameChoroplethDrawing(a: ChoroplethChartProps, b: ChoroplethChartProps): boolean {
  const values = (p: ChoroplethChartProps) => {
    const { feature, tooltip, graticule, margin } = choroplethPlan(p)

    return [
      p.data,
      p.enterTransition,
      p.aspectRatio,
      p.scale,
      p.center?.[0],
      p.center?.[1],
      p.translate?.[0],
      p.translate?.[1],
      margin.top,
      margin.right,
      margin.bottom,
      margin.left,
      feature?.fill,
      feature?.stroke,
      feature?.strokeWidth,
      feature?.fadedOpacity,
      feature?.getFeatureColor,
      feature?.patterns,
      feature?.getFeaturePattern,
      graticule?.stroke,
      graticule?.strokeWidth,
      graticule?.step?.[0],
      graticule?.step?.[1],
      tooltip?.content,
      tooltip?.formatValue,
      tooltip?.getFeatureName,
      tooltip?.getFeatureValue,
      tooltip?.valueLabel,
      tooltip?.className,
      tooltip?.panelStyle,
      tooltip?.backgroundColor,
    ]
  }

  const left = values(a),
    right = values(b)

  return (
    left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  )
}
