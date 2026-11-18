import { Effect } from 'effect'
import { createChartRuntime } from '@tanstack/charts'
import { sankeyDefinition } from '../src/sankey/build'
import { createSankeyRenderer } from '../src/sankey/presentation'
import type { SankeyDatum } from '../src/sankey/marks'

const mount = (container: HTMLElement) => {
  const runtime = createChartRuntime<SankeyDatum, number, number>()
  const presentation = createSankeyRenderer(() => {})
  const surface = presentation.renderer.mount(container, () => {})
  const scene = runtime.render(
    sankeyDefinition(
      {
        data: {
          nodes: [{ name: 'Start' }, { name: 'End' }],
          links: [{ source: 0, target: 1, value: 12 }],
        },
        animationDuration: 0,
      },
      'iframe-geometry',
      () => {},
      () => 0,
    ),
    { width: 630, height: 315 },
  )
  surface.render(scene, { ariaLabel: 'Sankey document geometry' })
  const element = surface.element
  const view = element.ownerDocument.defaultView
  if (view === null || !(element instanceof view.SVGSVGElement))
    throw new Error('Expected a native SVG in its owning document')
  let reads = 0
  let notifications = 0
  const rootMatrix = element.getScreenCTM.bind(element)
  element.getScreenCTM = () => {
    reads += 1
    return rootMatrix()
  }
  surface.subscribePresentationPoints?.(() => {
    notifications += 1
  })
  const snapshot = () => {
    const points = surface.getPresentationPoints?.() ?? []
    const root = rootMatrix()
    if (root === null) throw new Error('Expected connected SVG matrix')
    let error = 0
    for (const point of points) {
      const group = element.querySelector(`g[data-ts-key="${CSS.escape(point.markId)}"]`)
      const path = point.markId.startsWith('sankey:flow')
        ? group?.querySelectorAll<SVGPathElement>(':scope > path').item(point.datumIndex)
        : null
      const rect = group?.querySelector<SVGRectElement>(':scope > rect')
      const shape = path ?? rect
      if (shape === null || shape === undefined) continue
      const local = shape.getScreenCTM()
      if (local === null) throw new Error('Expected connected shape matrix')
      const box = shape.getBBox()
      const at = path
        ? path.getPointAtLength(path.getTotalLength() / 2)
        : new DOMPoint(box.x + box.width / 2, box.y + box.height / 2)
      const expected = at.matrixTransform(local).matrixTransform(root.inverse())
      error = Math.max(error, Math.hypot(expected.x - point.x, expected.y - point.y))
    }
    return {
      total: points.length,
      interactive: points.filter(
        (point) =>
          point.markId.startsWith('sankey:flow') || point.markId.startsWith('sankey:sankey-node'),
      ).length,
      sameRealm: element instanceof SVGSVGElement,
      reads,
      notifications,
      error,
    }
  }
  surface.render(scene, { ariaLabel: 'Sankey document geometry' })
  return {
    snapshot,
    advance() {
      reads = 0
      element.style.transform = 'translate(11px, 7px) scale(0.9)'
      for (const rect of element.querySelectorAll('rect'))
        rect.setAttribute('transform', 'translate(13 5)')
      presentation.request()
    },
    dispose() {
      presentation.request()
      surface.destroy()
      runtime.destroy()
      return { points: surface.getPresentationPoints?.(), notifications }
    },
  }
}

const nextFrame = Effect.callback<void>((resume) => {
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => resume(Effect.void))
  })
  return Effect.sync(() => cancelAnimationFrame(frame))
})

const setup = () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const root = document.getElementById('style-contract-root')
      if (root === null) throw new Error('Expected fixture root')
      const main = document.createElement('div')
      const iframe = document.createElement('iframe')
      yield* Effect.callback<void>((resume) => {
        const loaded = () => resume(Effect.void)
        iframe.addEventListener('load', loaded, { once: true })
        iframe.srcdoc = '<!doctype html><html><body></body></html>'
        root.append(main, iframe)
        return Effect.sync(() => iframe.removeEventListener('load', loaded))
      })
      const documentInFrame = iframe.contentDocument
      if (documentInFrame === null) throw new Error('Expected same-origin iframe')
      const framed = documentInFrame.createElement('div')
      documentInFrame.body.append(framed)
      const instances = [mount(main), mount(framed)]
      const run = Effect.runPromiseWith(yield* Effect.context<never>())
      return {
        snapshot: () => instances.map((instance) => instance.snapshot()),
        advance: () =>
          run(
            Effect.gen(function* () {
              for (const instance of instances) instance.advance()
              yield* nextFrame
              return instances.map((instance) => instance.snapshot())
            }),
          ),
        dispose: () =>
          run(
            Effect.gen(function* () {
              const before = instances.map((instance) => instance.dispose())
              yield* nextFrame
              const after = instances.map((instance) => instance.snapshot())
              root.replaceChildren()
              return { before, after }
            }),
          ),
      }
    }),
  )
Object.assign(window, { setupSankeyDocuments: setup })
export type SankeyDocuments = Awaited<ReturnType<typeof setup>>
