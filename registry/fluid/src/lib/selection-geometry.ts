/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import { normalizeGeometry, rectAt } from './indexed-geometry.js'
import type { IndexedGeometry } from './indexed-geometry.js'
import { spring } from './springs.js'
import type { ItemRect } from './hover-geometry.js'

export const assignRunIds: (
  sorted: ReadonlyArray<number>,
  prev: ReadonlyMap<number, number>,
  lastId: number,
) => RunIds = function assignRunIds(
  sorted: ReadonlyArray<number>,
  prev: ReadonlyMap<number, number>,
  lastId: number,
) {
  const spans: Array<{ start: number; end: number }> = []

  for (const idx of sorted) {
    const last = spans[spans.length - 1]

    if (last && idx === last.end + 1) last.end = idx
    else spans.push({ start: idx, end: idx })
  }

  const usedIds = new Set<number>()
  const byRow = new Map<number, number>()

  const runs = spans.map((span) => {
    let stableId: number | null = null

    for (let i = span.start; i <= span.end; i++) {
      const prevId = prev.get(i)

      if (prevId !== undefined && !usedIds.has(prevId)) {
        stableId = prevId
        break
      }
    }

    const id = stableId ?? ++lastId
    usedIds.add(id)

    for (let i = span.start; i <= span.end; i++) byRow.set(i, id)

    return { ...span, id }
  })

  return { runs, byRow, lastId }
}

export const buildSelectionBlocks: (
  runs: ReadonlyArray<Run>,
  itemRects: IndexedGeometry | ReadonlyArray<ItemRect | null>,
  R: number,
  boundaries: ReadonlyArray<Boundary>,
  prevRuns: ReadonlyArray<Run>,
) => Array<SelBlock> = function buildSelectionBlocks(
  runs: ReadonlyArray<Run>,
  itemRects: IndexedGeometry | ReadonlyArray<ItemRect | null>,
  R: number,
  boundaries: ReadonlyArray<Boundary>,
  prevRuns: ReadonlyArray<Run>,
) {
  const geometry = normalizeGeometry(itemRects)

  const rectOf: (start: number, end: number) => Rect | null = (start: number, end: number) => {
    const s = rectAt(geometry, start)
    const e = rectAt(geometry, end)

    if (!s || !e) return null

    return {
      top: s.top,
      left: Math.min(s.left, e.left),
      width: Math.max(s.width, e.width),
      height: e.top + e.height - s.top,
    }
  }

  const blocks: Array<SelBlock> = []

  for (const run of runs) {
    const r = rectOf(run.start, run.end)

    if (r)
      blocks.push({
        key: `sel-${run.id}`,
        ...r,
        radii: [R, R, R, R],
        instant: false,
        exitInstant: false,
        delayCorners: false,
      })
  }

  const byId = new Map(blocks.map((b) => [b.key, b]))

  for (const b of boundaries) {
    const gap = rectAt(geometry, b.gapIndex)
    const sv = byId.get(`sel-${b.survivorId}`)

    if (!gap || !sv) continue
    const midY = gap.top + gap.height / 2

    if (b.kind === 'merge') {
      if (b.phase === 'commit') {
        sv.instant = true
        blocks.push({
          key: `sel-${b.otherId}`,
          top: midY,
          left: sv.left,
          width: sv.width,
          height: sv.top + sv.height - midY,
          radii: [0, 0, R, R],
          instant: true,
          exitInstant: true,
          delayCorners: false,
          opacity: 0,
        })
        continue
      }

      const mergeCornerDelay = Math.min(
        cornerDelay + 0.03,
        Math.max(cornerDelay, cornerDelay + (midY / Math.max(gap.height, 1)) * 0.002),
      )

      const bottom = sv.top + sv.height
      sv.height = midY - sv.top
      sv.radii = [R, R, 0, 0]
      sv.delayCorners = true
      sv.cornerDelay = mergeCornerDelay
      blocks.push({
        key: `sel-${b.otherId}`,
        top: midY,
        left: sv.left,
        width: sv.width,
        height: bottom - midY,
        radii: [0, 0, R, R],

        enterFrom: { top: midY, height: bottom - midY, radii: [R, R, R, R] },
        instant: false,
        exitInstant: true,
        delayCorners: true,
        cornerDelay: mergeCornerDelay,
      })
    } else if (b.phase === 'splitIn') {
      const lo = byId.get(`sel-${b.otherId}`)

      if (!lo) continue

      const bottom = lo.top + lo.height
      sv.height = midY - sv.top
      sv.radii = [R, R, 0, 0]
      sv.instant = true
      lo.top = midY
      lo.height = bottom - midY
      lo.radii = [0, 0, R, R]
      lo.instant = true
      lo.enterFrom = { top: midY, height: bottom - midY, radii: [0, 0, R, R] }
    }
  }

  for (const p of prevRuns) {
    const c = bridgePair(p, runs)
    const gap = c && rectAt(geometry, c.gap)

    if (!c || !gap) continue
    const midY = gap.top + gap.height / 2
    const up = byId.get(`sel-${c.up.id}`)
    const lo = byId.get(`sel-${c.lo.id}`)

    if (!up || !lo) continue
    const bottom = lo.top + lo.height
    up.height = midY - up.top
    up.radii = [R, R, 0, 0]
    up.instant = true
    lo.top = midY
    lo.height = bottom - midY
    lo.radii = [0, 0, R, R]
    lo.instant = true
    lo.enterFrom = { top: midY, height: bottom - midY, radii: [0, 0, R, R] }
  }

  return blocks
}

export const mergeSpring = spring.moderate

export const cornerDelay = 0.07

export const convergeMs = (mergeSpring.duration + cornerDelay) * 1000 + 80

export const splitMs = mergeSpring.duration * 1000 + 80

export type Rect = { top: number; left: number; width: number; height: number }

export interface SelBlock extends Rect {
  key: string
  radii: [number, number, number, number]
  instant: boolean
  exitInstant: boolean
  delayCorners: boolean
  cornerDelay?: number
  opacity?: number

  enterFrom?: { top: number; height: number; radii: [number, number, number, number] }
}

export type Run = { start: number; end: number; id: number }

export interface RunIds {
  runs: ReadonlyArray<Run>
  /** Row index → the id of the run it belongs to. */
  byRow: Map<number, number>
  lastId: number
}

export interface Boundary {
  tid: number
  kind: 'merge' | 'split'
  survivorId: number
  otherId: number
  gapIndex: number
  phase: 'converge' | 'commit' | 'splitIn' | 'diverge'
}

export function bridgePair(outer: Run, runs: ReadonlyArray<Run>) {
  const inside = runs
    .filter((r) => r.start >= outer.start && r.end <= outer.end)
    .sort((a, b) => a.start - b.start)

  if (inside.length !== 2) return null
  const [up, lo] = inside

  if (!up || !lo) return null

  return lo.start === up.end + 2 ? { up, lo, gap: up.end + 1 } : null
}
