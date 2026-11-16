import { frame, cancelFrame } from 'motion-dom'
import type { ChartPoint, ChartScene } from '@tanstack/charts'
import { isRecord } from '../kit/guards'
import { poseOf, sweptArcBox } from './geometry'
import type { SectorFeed } from './sunburst-layer'

/** Public surface presentation points describe the same swept/scaled transparent paths that receive source pointer events. */
export function createSectorPresentation(feed: SectorFeed) {
  const remembered = new Map<string, ChartPoint<unknown, number, number>>()
  const listeners = new Set<(points: ReadonlyArray<ChartPoint<unknown, number, number>>) => void>()
  let scene: ChartScene<unknown, number, number> | undefined
  let points: ReadonlyArray<ChartPoint<unknown, number, number>> = []
  let pending = false
  const publish = () => {
    pending = false
    if (scene === undefined) return
    const x = scene.chart.x + scene.chart.width / 2,
      y = scene.chart.y + scene.chart.height / 2
    const next = scene.points.filter((point) => point.markId !== 'sunburst')
    for (const [id, entry] of feed.presented) {
      const point = remembered.get(id)
      if (point === undefined || entry.progress <= 0 || entry.arc[3] - entry.arc[2] < 0.5) continue
      const [start, end, inner, outer] = entry.arc,
        progress = entry.progress
      const span = (end - start) * progress
      if (span < 0.001) continue
      const pose = poseOf([start, start + span, inner, outer])
      const visual = entry.visual
      const origin = sweptArcBox(
        visual[0],
        (visual[1] - visual[0]) * progress,
        visual[2],
        visual[3],
      )
      next.push({
        ...point,
        x: x + origin.x + (pose.x - origin.x) * progress,
        y: y + origin.y + (pose.y - origin.y) * progress,
      })
    }
    points = next
    for (const listener of listeners) listener(points)
  }
  return {
    setScene(next: ChartScene<unknown, number, number>, liveIds: ReadonlySet<string>) {
      for (const id of feed.presented.keys()) if (!liveIds.has(id)) feed.presented.delete(id)
      scene = next
      for (const point of scene.points)
        if (
          point.markId === 'sunburst' &&
          isRecord(point.datum) &&
          typeof point.datum.id === 'string'
        )
          remembered.set(point.datum.id, point)
      publish()
    },
    request() {
      if (!pending) {
        pending = true
        frame.postRender(publish)
      }
    },
    getPresentationPoints: () => points,
    subscribePresentationPoints(
      listener: (points: ReadonlyArray<ChartPoint<unknown, number, number>>) => void,
    ) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    destroy() {
      cancelFrame(publish)
      listeners.clear()
      remembered.clear()
      scene = undefined
    },
  }
}
