// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
import { normalizeGeometry, rectAt } from './indexed-geometry.js'
import type { IndexedGeometry } from './indexed-geometry.js'
import { spring } from './springs.js'
import type { ItemRect } from './hover-geometry.js'

export const mergeSpring = spring.moderate

export const cornerDelay = 0.07

export const convergeMs = (mergeSpring.duration + cornerDelay) * 1000 + 80

export const splitMs = mergeSpring.duration * 1000 + 80

export type Rect = { top: number; left: number; width: number; height: number }

export interface SelBlock extends Rect {
  key: string
  radii: [number, number, number, number] // tl, tr, br, bl
  instant: boolean // skip the spring (the zero-shift swap, the split snap-in)
  exitInstant: boolean // drop without the fade (absorbed half at the swap)
  delayCorners: boolean // trail the corner straightening (merge converge)
  cornerDelay?: number // optional per-block delay override
  opacity?: number // override the hover-derived opacity (commit ghost = 0)
  // State a fresh block animates *from* on mount, so it springs into place
  // instead of snapping when continuity is lost (fast toggling) or the block is
  // inherently new (a split's lower half). Continuous blocks ignore it.
  enterFrom?: { top: number; height: number; radii: [number, number, number, number] }
}

export type Run = { start: number; end: number; id: number }

export interface RunIds {
  runs: ReadonlyArray<Run>
  /** Row index → the id of the run it belongs to. */
  byRow: Map<number, number>
  lastId: number
}

export function assignRunIds(
  sorted: ReadonlyArray<number>,
  prev: ReadonlyMap<number, number>,
  lastId: number,
): RunIds {
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

export interface Boundary {
  tid: number
  kind: 'merge' | 'split'
  survivorId: number // persisting run (merged run / split's upper run)
  otherId: number // merge: absorbed run; split: new lower run
  gapIndex: number // bridging/deselected row — where the halves meet
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

export function buildSelectionBlocks(
  runs: ReadonlyArray<Run>,
  itemRects: IndexedGeometry | ReadonlyArray<ItemRect | null>,
  R: number,
  boundaries: ReadonlyArray<Boundary>,
  prevRuns: ReadonlyArray<Run>,
): Array<SelBlock> {
  const geometry = normalizeGeometry(itemRects)

  const rectOf = (start: number, end: number): Rect | null => {
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
        // Zero-shift swap: survivor jumps to the full union (already covered by
        // its top half + the absorbed bottom half). The absorbed half is held
        // one render at opacity 0 so removing it next render can't flash a
        // one-frame overlap with the now-full survivor.
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

      // converge: survivor → top half, absorbed run → bottom-half ghost, inner
      // corners straightening to sharp.
      // Slightly trail lower merges while keeping a baseline and small cap.
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
        // Mount at full corners so a fresh ghost still animates the
        // straightening with the same delay as the survivor.
        enterFrom: { top: midY, height: bottom - midY, radii: [R, R, R, R] },
        instant: false,
        exitInstant: true,
        delayCorners: true,
        cornerDelay: mergeCornerDelay,
      })
    } else if (b.phase === 'splitIn') {
      const lo = byId.get(`sel-${b.otherId}`)

      if (!lo) continue
      // Pin both halves at the seam (identical to the single block); the
      // diverge render then springs them to their real rects.
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
    // diverge: nothing to override — the steady blocks spring to their real
    // rects from the seam; the timer drops the boundary.
  }

  // Split safety net, pinned synchronously. The split boundary above is created
  // in a layout effect that runs *after* this render, so on the very frame a
  // split first appears its fresh lower half would mount at its final rect and
  // snap. Detecting the split here (previous runs vs current) and pinning both
  // halves at the seam guarantees the lower mounts on the seam regardless of
  // render/paint timing (the cause of the rapid-toggle snap).
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
