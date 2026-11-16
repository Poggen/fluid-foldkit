// Pie hover as static scoped CSS keyed on the host `data-hover="<index>"`, so a hover never rebuilds the definition; the pop is a transform on each arc's <g>.
// Each authored role owns its geometry variables; repeated data indices share hover authority.
import type { SpringDriver } from './spring-driver'
import { HOVER_SPRING } from '../../kit/motion/springs'
import { isMotionNode } from '../../kit/renderer-dom'

const MAX_INDEX = 32

const RING_HOVER_SCALE = 1.03

const RING_PUSHED_SCALE = 1.02

const baseCss = (host: string, fade: number): string =>
  `${host}[data-hover] g.bkm-pie-arc{--bkm-pie-opacity:${fade}}`

const PIE_HOST = '[data-bkm-chart="pie"]'

interface PieHoverVars {
  readonly vars: Record<string, string>
  readonly grow: string
}

const buildPieCss = (fade: number, rows: ReadonlyArray<PieHoverRow>, host = PIE_HOST): string => {
  let css = baseCss(host, fade)

  for (const row of rows) {
    const slice = `g.bkm-pie-role${row.roleIndex}`
    css += `${host}[data-hover="${row.sliceIndex}"] ${slice}{--bkm-pie-opacity:1}`

    if (row.effect === 'translate') {
      css += `${host}[data-hover="${row.sliceIndex}"] ${slice}{--bkm-pie-transform:var(--bkm-tf${row.roleIndex})}`
    }
  }

  return css
}

interface PieHoverRow {
  readonly roleIndex: number
  readonly showGlow: boolean
  readonly glowColor: string
  readonly sliceIndex: number
  readonly startAngle: number
  readonly endAngle: number
  readonly effect: string
  readonly offset: number
}

interface PieGrowGeometry<TRow extends PieHoverRow> {
  /** Resting outer radius (px) of the polar mark. */
  readonly outerRadius: number
  /** Builds a slice outline at a given outer radius. */
  readonly pathAt: (row: TRow, outerRadius: number) => string
  readonly isDonut: boolean
}

/** Per-slice hover geometry, set once on the host: `--bkm-tf<i>` is the whole hover transform (translate along the mid-angle, or a uniform scale for a pie `grow`),
 * `--bkm-gd<i>` the grown donut outline. Returns the vars plus the `data-bkm-grow` index list that scopes the donut `d` rule. */
const pieHoverVars = <TRow extends PieHoverRow>(
  rows: ReadonlyArray<TRow>,
  geometry: Readonly<PieGrowGeometry<TRow>>,
): PieHoverVars => {
  const vars: Record<string, string> = {}
  const grow: Array<number> = []

  for (const row of rows) {
    vars[`--bkm-glow${row.roleIndex}`] = row.glowColor

    if (row.offset === 0) {
      continue
    }

    switch (row.effect) {
      case 'translate': {
        const mid = (row.startAngle + row.endAngle) / 2
        vars[`--bkm-tf${row.roleIndex}`] =
          `translate(${Math.sin(mid) * row.offset}px,${-Math.cos(mid) * row.offset}px)`
        break
      }

      case 'grow': {
        if (geometry.isDonut) {
          grow.push(row.roleIndex)
          vars[`--bkm-gd${row.roleIndex}`] =
            `path("${geometry.pathAt(row, geometry.outerRadius + row.offset)}")`
        } else {
          vars[`--bkm-tf${row.roleIndex}`] =
            `scale(${(geometry.outerRadius + row.offset) / geometry.outerRadius})`
        }

        break
      }

      default: {
        break
      }
    }
  }

  return { grow: grow.join(' '), vars }
}

/** The hover springs of a pie: on a hover change the previous and the new slice each retarget from their live position and velocity
 * (translate px, pie-grow scale, donut-grow outer radius); rest/hot values are the static rules above. */
const createPieHoverSprings = (
  rows: ReadonlyArray<PieHoverRow>,
  springDriver: SpringDriver,
): ((host: HTMLElement, previous: number | null, next: number | null) => void) => {
  const byIndex = new Map<number, Array<PieHoverRow>>()

  for (const row of rows) {
    if (row.offset !== 0 && row.effect === 'translate') {
      byIndex.set(row.sliceIndex, [...(byIndex.get(row.sliceIndex) ?? []), row])
    }
  }

  // Slice groups resolved by our own className once, then reused while still mounted (the renderer swaps nodes on a scene change).
  const groups = new Map<number, Element>()

  const groupOf = (host: HTMLElement, index: number): Element | null => {
    const cached = groups.get(index)

    if (cached?.isConnected === true) {
      return cached
    }

    const found = host.querySelector(`g.bkm-pie-role${index}`)

    if (found === null) {
      groups.delete(index)
    } else {
      groups.set(index, found)
    }

    return found
  }

  const retarget = (
    host: HTMLElement,
    row: PieHoverRow,
    hovered: number | null,
    previous: number | null,
  ): void => {
    const index = row.sliceIndex
    const group = groupOf(host, row.roleIndex)

    // Groups are found by our own `className` (gaps #20/#36: no transform channel in `states`); a mid-tween node keeps its tween (#50).
    if (group === null || isMotionNode(group)) {
      return
    }

    const hot = (state: number | null): boolean => state === index

    if (row.effect === 'translate') {
      const mid = (row.startAngle + row.endAngle) / 2
      const dx = Math.sin(mid)
      const dy = -Math.cos(mid)
      springDriver.play({
        affine: true,
        el: group,
        frames: true,
        frame: (value) => ({ transform: `translate(${dx * value}px,${dy * value}px)` }),
        rest: hot(previous) ? row.offset : 0,
        spring: HOVER_SPRING,
        target: hot(hovered) ? row.offset : 0,
      })
    }
  }

  return (host, previous, next) => {
    for (const index of new Set([previous, next])) {
      if (index !== null) {
        for (const row of byIndex.get(index) ?? []) {
          retarget(host, row, next, previous)
        }
      }
    }
  }
}

export {
  buildPieCss,
  createPieHoverSprings,
  MAX_INDEX,
  pieHoverVars,
  RING_HOVER_SCALE,
  RING_PUSHED_SCALE,
}
