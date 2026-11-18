import { createChartRuntime } from '@tanstack/charts'
import { SankeyLink, SankeyNode } from '../src/sankey/carriers'
import { sankeyDefinition, sankeyPlan } from '../src/sankey/build'
import { createSankeyRenderer, hitSankeyPresentation } from '../src/sankey/presentation'
import { createNodeMotion } from '../src/sankey/node-motion'
import { createFlowEntrance } from '../src/sankey/flow-entrance'
import { createPaintFeed } from '../src/sankey/paint-feed'
import { styleOccurrences } from '../src/sankey/occurrence-style'
import type { SankeyDatum } from '../src/sankey/marks'
import type { SankeyChartProps } from '../src/sankey/props'

const root = document.getElementById('style-contract-root')
if (!(root instanceof HTMLElement)) throw new Error('Expected chart fixture root')
root.style.width = '800px'
root.style.height = '400px'
root.dataset.bkmChart = 'sankey'
let props: SankeyChartProps = {
  data: {
    nodes: [{ name: 'Start' }, { name: 'Other' }, { name: 'End' }],
    links: [
      { source: 0, target: 2, value: 12 },
      { source: 1, target: 2, value: 8 },
    ],
  },
  animationDuration: 1600,
  children: [SankeyLink({ stroke: '#123456' }), SankeyNode()],
}
const feed = createPaintFeed()
const presentation = createSankeyRenderer((host) => {
  const paintProps = { ...props, children: sankeyPlan(props).paintChildren }
  styleOccurrences(host, paintProps)
  flows.sync(host, paintProps, feed)
  nodes.sync(host, paintProps)
})
const nodes = createNodeMotion(presentation.request)
const flows = createFlowEntrance(presentation.request)
const runtime = createChartRuntime<SankeyDatum, number, number>()
const surface = presentation.renderer.mount(root, () => {})
const render = () => {
  const scene = runtime.render(
    sankeyDefinition(
      props,
      'geometry',
      () => {},
      () => performance.now(),
      undefined,
      feed,
    ),
    { width: 800, height: 400 },
  )
  surface.render(scene, { ariaLabel: 'Sankey measurement contract' })
}
render()
const svg = root.querySelector('svg')
if (svg === null) throw new Error('Expected mounted SVG')
const screen = (element: SVGGraphicsElement) =>
  SVGGraphicsElement.prototype.getScreenCTM.call(element)
let rootReads = 0
svg.getScreenCTM = () => {
  rootReads += 1
  return screen(svg)
}
const samples: Array<{
  reads: number
  count: number
  error: number
  flowX: number | null
  paintedLength: number
  interactiveCount: number
}> = []
const sample = () => {
  const points = surface.getPresentationPoints?.() ?? []
  const owner = screen(svg)
  if (owner === null) throw new Error('Expected connected root matrix')
  let error = 0
  for (const point of points) {
    const group = root.querySelector(`g[data-ts-key="${CSS.escape(point.markId)}"]`)
    const element = point.markId.startsWith('sankey:flow')
      ? group?.querySelectorAll('path').item(point.datumIndex)
      : group?.querySelector('rect')
    if (!(element instanceof SVGGraphicsElement)) continue
    const local = screen(element)
    if (local === null) throw new Error('Expected live child matrix')
    let at: DOMPoint
    if (element.tagName === 'path' && element instanceof SVGPathElement) {
      at = element.getPointAtLength(element.getTotalLength() / 2)
    } else {
      const box = element.getBBox()
      at = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2)
    }
    const expected = at.matrixTransform(local).matrixTransform(owner.inverse())
    error = Math.max(error, Math.hypot(expected.x - point.x, expected.y - point.y))
  }
  samples.push({
    reads: rootReads,
    count: points.length,
    interactiveCount: points.filter(
      (point) =>
        point.markId.startsWith('sankey:flow') || point.markId.startsWith('sankey:sankey-node'),
    ).length,
    error,
    paintedLength: (() => {
      const path = root.querySelector<SVGPathElement>('g[data-ts-key^="sankey:flow"] path')
      return path === null ? 0 : path.getTotalLength() - Number(path.style.strokeDashoffset || 0)
    })(),
    flowX: points.find((point) => point.markId.startsWith('sankey:flow'))?.x ?? null,
  })
  rootReads = 0
}
surface.subscribePresentationPoints?.(sample)
const probe = {
  samples,
  immediate() {
    rootReads = 0
    render()
    return samples.at(-1)
  },
  collapse() {
    root.style.transform = 'scale(0)'
    presentation.request()
  },
  relocate() {
    root.style.transform = 'translate(13px, 7px) scale(0.9)'
    presentation.request()
  },
  repaintFocus() {
    surface.paintFocus(null)
    presentation.request()
  },
  retarget() {
    props = {
      ...props,
      data: {
        ...props.data,
        links: [
          { source: 0, target: 2, value: 7 },
          { source: 1, target: 2, value: 13 },
        ],
      },
    }
    render()
  },
  hit() {
    const points = surface.getPresentationPoints?.() ?? []
    return points
      .filter((point) => point.markId.startsWith('sankey:sankey-node'))
      .map((point) => hitSankeyPresentation(root, point, point.x, point.y))
  },
  currentFlowHits() {
    const point = surface
      .getPresentationPoints?.()
      ?.find((point) => point.markId.startsWith('sankey:flow'))
    const path = root.querySelector<SVGPathElement>('g[data-ts-key^="sankey:flow"] path')
    if (point === undefined || path === null) throw new Error('Expected native flow')
    const attributes = ['d', 'stroke-width', 'transform'].map(
      (name) => [name, path.getAttribute(name)] as const,
    )
    const hit = (x: number, y: number) => {
      const local = screen(path),
        owner = screen(svg)
      if (local === null || owner === null) throw new Error('Expected connected matrices')
      const at = new DOMPoint(x, y).matrixTransform(local).matrixTransform(owner.inverse())
      return hitSankeyPresentation(root, point, at.x, at.y)
    }
    try {
      path.setAttribute('d', 'M30,80C100,80,100,120,170,120')
      path.setAttribute('stroke-width', '24')
      path.setAttribute('transform', 'translate(20 40) scale(1.1 0.9)')
      const wide = [hit(100, 100), hit(100, 110), hit(100, 130), hit(29, 80), hit(171, 120)]
      path.setAttribute('stroke-width', '4')
      const narrow = [hit(100, 100), hit(100, 110)]
      path.setAttribute('d', 'M170,120C100,120,100,80,30,80')
      const reversed = [hit(100, 100), hit(171, 120), hit(29, 80)]
      return { wide, narrow, reversed }
    } finally {
      for (const [name, value] of attributes) {
        if (value === null) path.removeAttribute(name)
        else path.setAttribute(name, value)
      }
      rootReads = 0
    }
  },
  replay() {
    flows.clear()
    nodes.clear()
    render()
  },
  dispose() {
    presentation.request()
    flows.clear()
    nodes.clear()
    surface.destroy()
    runtime.destroy()
    return {
      points: surface.getPresentationPoints?.(),
      animations: root.getAnimations({ subtree: true }).length,
    }
  },
}
Object.assign(window, { sankeyProbe: probe })
export type SankeyProbe = typeof probe
