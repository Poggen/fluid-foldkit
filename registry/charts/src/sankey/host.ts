import { createPaintFeed } from './paint-feed'
import { mountCartesianRenderer } from '../cartesian/font-renderer'
import { sankeyFontMeasurement } from './font-measurement'
import type {
  ChartRendererHost,
  ChartScene,
  ChartPoint,
  ChartInteractionController,
} from '@tanstack/charts'
import type { SankeyDatum } from './marks'
import type { State, Inputs, Host, Observation } from './block'
import type { SankeyChartProps } from './props'
import { sankeyDefinition, sankeyPlan, sameSankeyDrawing } from './build'
import {
  createSankeyHoverWriter,
  sankeyHoverCss,
  sankeyIndexCss,
  sankeyHoverSets,
  sankeyHoverVars,
} from './hover-css'
import { SANKEY_NODE_POINT_MARK_ID, SANKEY_LINK_POINT_MARK_ID } from './focus'
import { sankeyTooltipKey } from './focus'
import { nativeTooltip } from './private/native-tooltip'
import { createKeyboardHold } from '../kit/interaction/keyboard-hold'
import { mountTapFocus } from '../kit/interaction/tap-focus'
import { alignEntranceStart } from '../kit/entrance/entrance-origin'
import { SANKEY_ENTRANCE_ORIGINS } from './entrance'
import { toCssEase } from '../kit/motion/enter-transition'
import { resourceElement, scopePatterns } from './resources'
import { createFlowEntrance } from './flow-entrance'
import { styleOccurrences } from './occurrence-style'
import { createNodeMotion } from './node-motion'
import { createSankeyRenderer, hitSankeyPresentation } from './presentation'

export class SankeyHost implements Host {
  readonly root = document.createElement('div')
  readonly #fontMetrics = sankeyFontMeasurement(this.root)
  readonly #surface = document.createElement('div')
  readonly #indexStyle = document.createElement('style')
  readonly #writer = createSankeyHoverWriter()
  readonly #presentation = createSankeyRenderer((root) => {
    const paintProps = { ...this.#props, children: this.#plan.paintChildren }
    styleOccurrences(root, paintProps)
    this.#flows.sync(root, paintProps, this.#feed)
    this.#nodes.sync(root, paintProps)
  })
  readonly #flows = createFlowEntrance(this.#presentation.request)
  readonly #nodes = createNodeMotion(this.#presentation.request)
  readonly #clock: () => number
  readonly #observe: (event: Observation) => void
  readonly #tooltipExtension: ReturnType<typeof nativeTooltip>
  #state: State
  #props: SankeyChartProps
  #plan: ReturnType<typeof sankeyPlan>
  #chart: ChartRendererHost<SankeyDatum, number, number> | undefined
  #interaction: ChartInteractionController<SankeyDatum, number, number> | undefined
  #scene: ChartScene<SankeyDatum, number, number> | undefined
  #releaseHold: ReturnType<typeof createKeyboardHold<SankeyDatum, number, number>> | undefined
  #releaseTap: (() => void) | undefined
  #releaseAlign: (() => void) | undefined
  #frame = 0
  #readyFrame = 0
  #started = 0
  #reveal = ''
  readonly #feed = createPaintFeed()
  #resourceKey = ''
  #resourceSvg: SVGSVGElement | undefined
  #settingTooltip = false
  #previousNode: { readonly index: number; readonly markId: string } | null = null
  constructor(
    element: HTMLElement,
    state: State,
    props: SankeyChartProps,
    observe: (event: Observation) => void,
    clock: () => number,
  ) {
    this.#state = state
    this.#props = props
    this.#plan = sankeyPlan(props)
    this.#observe = observe
    this.#clock = clock
    this.#tooltipExtension = nativeTooltip(`${state.id}-tooltip`, true, sankeyTooltipKey, () => {
      const anchor = this.#state.tooltipAnchor

      return anchor === null
        ? null
        : { x: anchor.x + this.#plan.margin.left, y: anchor.y + this.#plan.margin.top }
    })
    this.#feed.hit = (markId, datumIndex, x, y) =>
      hitSankeyPresentation(this.#surface, { markId, datumIndex }, x, y)
    this.#observe({ _tag: 'ObservedNodeControl', controlled: props.hoveredNodeIndex !== undefined })
    this.root.dataset.bkmChart = 'sankey'
    this.root.dataset.bkmSkId = state.id
    this.root.dataset.slot = 'chart'
    this.#surface.classList.add('w-full')
    element.replaceChildren(this.root)
    this.root.addEventListener('mouseleave', this.#left)
    this.#mount()
  }
  #mount() {
    const staticStyle = document.createElement('style')
    staticStyle.textContent = sankeyHoverCss()
    this.root.replaceChildren(staticStyle, this.#indexStyle, this.#surface)
    this.#style()
    this.root.setAttribute('data-bkm-sk-hold', '')
    this.#reveal = this.#props.revealSignature ?? ''
    this.#releaseHold = createKeyboardHold(this.root, () => this.#interaction)
    this.#releaseTap = mountTapFocus(this.root, () => this.#interaction, 'tap')
    this.#started = this.#clock()
    this.#chart = mountCartesianRenderer(this.#surface, this.#options(), () => this.#fontMetrics)
    this.#releaseAlign = alignEntranceStart(
      this.root,
      SANKEY_ENTRANCE_ORIGINS,
      this.#started,
      true,
      this.#clock,
    )
    this.#frame = requestAnimationFrame(() => {
      this.root.removeAttribute('data-bkm-sk-hold')
      this.#frame = 0
    })
    this.#armReady()
  }
  #style() {
    const { node, link, data } = this.#plan
    const counts = { nodes: data.nodes.length, links: data.links.length }
    const indexCss = sankeyIndexCss(this.#state.id, counts)
    if (this.#indexStyle.textContent !== indexCss) this.#indexStyle.textContent = indexCss
    const index =
      this.#props.hoveredNodeIndex === undefined
        ? this.#state.hoveredNodeIndex
        : this.#props.hoveredNodeIndex
    const focus =
      index !== null
        ? { node: index }
        : this.#state.hoveredLinkIndex === null
          ? null
          : { link: this.#state.hoveredLinkIndex }
    this.#writer.write(
      this.#indexStyle.sheet,
      focus === null ? null : sankeyHoverSets(data.links, focus),
      counts,
    )
    this.#nodes.hover(focus)
    this.#flows.hover(focus)
    this.root.className = this.#props.className ?? ''
    this.root.classList.add('relative', 'w-full', 'select-none')

    for (const [key, value] of Object.entries(
      sankeyHoverVars(
        node.fadedOpacity ?? 0.4,
        link.fadedOpacity ?? 0.1,
        link.strokeOpacity ?? 0.5,
      ),
    )) {
      this.root.style.setProperty(key, String(value))
    }

    this.root.style.setProperty(
      '--bkm-sankey-dur',
      `${Math.round((this.#props.enterTransition?.duration ?? (this.#props.animationDuration ?? 1100) / 1000) * 1000)}ms`,
    )
    this.root.style.setProperty('--bkm-sankey-ease', toCssEase(this.#props.enterTransition?.ease))
    this.root.style.setProperty('--bkm-sankey-n', String(Math.max(1, data.nodes.length)))
    this.#paintResources()
  }
  #paintResources() {
    const resources = [
      ...this.#feed.gradients,
      ...this.#plan.paintChildren.flatMap((child, occurrence) =>
        child.role === 'link'
          ? scopePatterns(child.props.patterns ?? [], `${this.#state.id}-role-${occurrence}-`)
          : [],
      ),
    ]
    const key = JSON.stringify(resources)
    if (this.#resourceKey === key && this.#resourceSvg?.parentNode === this.root) return
    this.#resourceKey = key
    this.#resourceSvg?.remove()
    this.#resourceSvg = undefined
    if (resources.length === 0) return
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
      defs = document.createElementNS(svg.namespaceURI, 'defs')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.setAttribute('focusable', 'false')
    svg.setAttribute('class', 'absolute w-0 h-0 overflow-hidden')
    defs.append(...resources.map(resourceElement))
    svg.append(defs)
    this.#resourceSvg = svg
    this.root.append(svg)
  }
  #armReady() {
    const view = this.root.ownerDocument.defaultView
    view?.clearTimeout(this.#readyFrame)
    this.root.removeAttribute('data-bkm-ready')

    const ready = () => {
      this.root.setAttribute('data-bkm-ready', '')
      this.#observe({ _tag: 'ObservedEntered' })
    }

    if ((this.#props.animationDuration ?? 1100) <= 0) {
      ready()
    } else {
      this.#readyFrame = view?.setTimeout(ready, this.#props.animationDuration ?? 1100) ?? 0
    }
  }
  #options() {
    return {
      idPrefix: this.#state.id,
      definition: sankeyDefinition(
        this.#props,
        this.#state.id,
        (reversed) => this.root.toggleAttribute('data-bkm-reversed', reversed),
        this.#clock,
        this.#plan,
        this.#feed,
        this.#tooltipExtension,
        this.#fontMetrics.measure,
      ),
      renderer: this.#presentation.renderer,
      aspectRatio: ratio(this.#props.aspectRatio ?? '2 / 1'),
      ariaLabel: this.#props.ariaLabel ?? 'Sankey chart',
      ...(this.#props.ariaDescription === undefined
        ? {}
        : { ariaDescription: this.#props.ariaDescription }),
      onRender: ({
        scene,
        interaction,
      }: {
        scene: ChartScene<SankeyDatum, number, number>
        interaction: ChartInteractionController<SankeyDatum, number, number>
      }) => {
        this.#scene = scene
        this.#interaction = interaction
        this.#paintResources()

        if (scene.width !== this.#state.width || scene.height !== this.#state.height) {
          this.#observe({ _tag: 'ObservedSize', width: scene.width, height: scene.height })
        }

        this.#focus()
      },
      onFocusChange: (point: ChartPoint<SankeyDatum, number, number> | null) =>
        this.#focused(point),
    }
  }
  #focused(point: ChartPoint<SankeyDatum, number, number> | null) {
    if (this.#settingTooltip) return
    this.#releaseHold?.onFocus(point)

    const plan = this.#plan,
      datum = point?.datum

    const node =
      point?.markId.startsWith(SANKEY_NODE_POINT_MARK_ID) === true &&
      datum !== undefined &&
      'key' in datum &&
      typeof datum.key === 'number'
        ? datum.key
        : null

    const link =
      point?.markId.startsWith(SANKEY_LINK_POINT_MARK_ID) === true &&
      datum !== undefined &&
      'data' in datum
        ? plan.data.links.findIndex((link) => link === datum.data)
        : null

    const kind = node !== null ? 'node' : link !== null ? 'link' : 'none',
      index = node ?? link

    const controlled = this.#props.hoveredNodeIndex
    const graphNode = controlled === undefined ? node : controlled
    const focus = graphNode !== null ? { node: graphNode } : link !== null ? { link } : null
    this.#nodes.hover(focus)
    this.#flows.hover(focus)
    this.#writer.write(
      this.#indexStyle.sheet,
      focus === null ? null : sankeyHoverSets(plan.data.links, focus),
      { nodes: plan.data.nodes.length, links: plan.data.links.length },
    )
    const previous = this.#previousNode
    const changed = previous?.index !== node || previous?.markId !== point?.markId
    this.#previousNode =
      node === null || point === null ? null : { index: node, markId: point.markId }

    if (controlled !== undefined && changed) {
      if (previous !== null) this.#observe({ _tag: 'ObservedNodeHoverRequest', index: null })
      if (node !== null) this.#observe({ _tag: 'ObservedNodeHoverRequest', index: node })
    }

    this.#observe({ _tag: 'ObservedFocus', kind, index, nodeControlled: controlled !== undefined })
  }
  #left = () => {
    if (this.#props.hoveredNodeIndex !== undefined)
      this.#observe({ _tag: 'ObservedNodeHoverRequest', index: null })
  }
  #focus() {
    this.#style()
  }
  #tooltip() {
    const index = this.#state.tooltipIndex
    const kind = this.#state.tooltipKind
    const point =
      this.#scene?.points.find((candidate) =>
        kind === 'node'
          ? candidate.markId.startsWith(SANKEY_NODE_POINT_MARK_ID) &&
            'key' in candidate.datum &&
            candidate.datum.key === index
          : kind === 'link' &&
            candidate.markId.startsWith(SANKEY_LINK_POINT_MARK_ID) &&
            'data' in candidate.datum &&
            candidate.datum.data === this.#plan.data.links.at(index ?? -1),
      ) ?? null
    this.#settingTooltip = true
    try {
      this.#interaction?.setControlledFocus(point)
    } finally {
      this.#settingTooltip = false
    }
  }
  update(state: State, inputs: Inputs) {
    const previous = this.#state
    this.#state = state
    inputs.configure(this)

    if (previous.focusRevision !== state.focusRevision) {
      this.#focus()
    }
    if (previous.tooltipRevision !== state.tooltipRevision) this.#tooltip()
  }
  #redraw() {
    this.#settingTooltip = true
    try {
      this.#chart?.update(this.#options())
    } finally {
      this.#settingTooltip = false
    }
  }
  configure(props: SankeyChartProps) {
    if (this.#props === props) {
      return
    }

    const unchanged = sameSankeyDrawing(this.#props, props)
    const controlChanged = this.#props.hoveredNodeIndex !== props.hoveredNodeIndex
    const controlModeChanged =
      (this.#props.hoveredNodeIndex === undefined) !== (props.hoveredNodeIndex === undefined)
    this.root.className = `relative w-full select-none ${props.className ?? ''}`

    if (unchanged) {
      this.#props = props
      if (controlModeChanged)
        this.#observe({
          _tag: 'ObservedNodeControl',
          controlled: props.hoveredNodeIndex !== undefined,
        })

      if (controlChanged) {
        this.#focus()
      }

      return
    }

    const durationChanged =
      (this.#props.animationDuration ?? 1100) !== (props.animationDuration ?? 1100)
    const replay = this.#reveal !== (props.revealSignature ?? '') || durationChanged

    this.#plan = sankeyPlan(props, this.#props.data === props.data ? this.#plan.data : undefined)
    this.#props = props
    if (controlModeChanged)
      this.#observe({
        _tag: 'ObservedNodeControl',
        controlled: props.hoveredNodeIndex !== undefined,
      })

    if (replay) {
      this.#flows.clear()
      this.#nodes.clear()
      this.#reveal = props.revealSignature ?? ''
      this.#observe({ _tag: 'ObservedReplay' })
      this.#style()
      this.#redraw()
      this.#armReady()
    } else {
      this.#style()
      this.#redraw()
    }
  }
  #release() {
    this.#flows.clear()
    this.#nodes.clear()
    this.#previousNode = null
    this.#chart?.destroy()
    this.#releaseHold?.destroy()
    this.#releaseTap?.()
    this.#releaseAlign?.()
    cancelAnimationFrame(this.#frame)
    this.root.ownerDocument.defaultView?.clearTimeout(this.#readyFrame)
  }
  destroy() {
    this.#release()
    this.root.removeEventListener('mouseleave', this.#left)
    this.root.remove()
  }
}

export const ratio: (value: string) => number = (value: string) => {
  const [w, h] = value.split('/').map(Number)

  return w !== undefined &&
    h !== undefined &&
    Number.isFinite(w) &&
    Number.isFinite(h) &&
    w !== 0 &&
    h > 0
    ? w / h
    : Number(value) > 0
      ? Number(value)
      : 2
}
