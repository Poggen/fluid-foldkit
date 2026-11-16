import type { ChartRendererHost } from '@tanstack/charts'
import type { CartesianSnapshot } from './definition'
import type { Interaction } from './state'
import type { NativeObservation } from './native-resource'

export function pointerObservations<Row, SceneDatum>(
  element: HTMLElement,
  host: ChartRendererHost<SceneDatum, Date, number>,
  snapshot: () => CartesianSnapshot<Row> | undefined,
  state: () => Interaction | undefined,
  observe: NativeObservation,
  data: () => ReadonlyArray<Row>,
): () => void {
  let activePointerId: number | null = null

  const point = (event: MouseEvent) => {
    const plot = snapshot()
    const at = host.interaction.clientToScene(event.clientX, event.clientY)

    if (plot === undefined || at === null) return null
    const x = at.x - plot.margin.left
    const y = at.y - plot.margin.top

    if (x < 0 || x > plot.innerWidth || y < 0 || y > plot.innerHeight) return null

    const time =
      plot.domains.x[0].getTime() +
      (x / plot.innerWidth) * (plot.domains.x[1].getTime() - plot.domains.x[0].getTime())

    let index = 0
    let distance = Infinity

    for (const [candidate, value] of plot.hover.times.entries())
      if (Math.abs(value - time) < distance) {
        distance = Math.abs(value - time)
        index = candidate
      }

    const row = plot.rows[index]

    return { x, index: row === undefined ? 0 : data().indexOf(row) }
  }

  const down = (event: PointerEvent) => {
    if (
      activePointerId !== null ||
      event.pointerType === 'touch' ||
      event.button !== 0 ||
      state()?.revealReady !== true
    ) {
      return
    }

    const at = point(event)

    if (at !== null) {
      activePointerId = event.pointerId
      event.stopPropagation()
      observe.drag('start', at.x, at.index)
    }
  }

  const move = (event: PointerEvent) => {
    if (
      event.pointerId !== activePointerId ||
      event.pointerType === 'touch' ||
      (event.buttons & 1) === 0
    ) {
      return
    }

    const at = point(event)

    if (at !== null) {
      event.stopPropagation()
      observe.drag('move', at.x, at.index)
    }
  }

  const end = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) {
      return
    }

    activePointerId = null
    observe.drag('end', 0, 0)
  }

  const mouse = (event: MouseEvent) => {
    if (event.button === 0 && state()?.revealReady === true && point(event) !== null)
      event.preventDefault()
  }

  element.addEventListener('pointerdown', down, true)
  element.addEventListener('pointermove', move, true)
  element.addEventListener('mousedown', mouse, true)
  element.addEventListener('pointerleave', end)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)

  return () => {
    activePointerId = null
    element.removeEventListener('pointerdown', down, true)
    element.removeEventListener('pointermove', move, true)
    element.removeEventListener('mousedown', mouse, true)
    element.removeEventListener('pointerleave', end)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
  }
}
