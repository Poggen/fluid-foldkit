import { hoverGrowForPathSegment, hubScale, ID_SEP, ringOptions } from './arcs'
import type { ArcDatum } from './arcs'

export interface SectorPush {
  readonly thickness: number
  readonly bisector: number
  readonly halfSweep: number
  readonly minR: number
  readonly maxR: number
}

const onPath = (arc: ArcDatum, hovered: ArcDatum): boolean =>
  arc.id === hovered.id || hovered.id.startsWith(`${arc.id}${ID_SEP}`)

export interface PushInput {
  readonly arcs: ReadonlyArray<ArcDatum>
  readonly sectors: ReadonlyMap<string, SectorPush>
  readonly hovered: ArcDatum | null
  readonly focusDepth: number
  readonly maxDepth: number
  readonly popOut: number
}

/** bklit's per-arc grow for the hovered path (buildHoverGrowTargets): one segment grow for the visible path length,
 * capped at one expanded first-level ring (maxHoverSegmentThickness). */
export const growTargets = ({
  arcs,
  sectors,
  hovered,
  focusDepth,
  maxDepth,
  popOut,
}: Readonly<PushInput & { readonly hovered: ArcDatum }>): Map<string, number> => {
  const targets = new Map<string, number>()
  const ringWidth = sectors.get(hovered.id)?.thickness ?? 0

  if (ringWidth <= 0) {
    return targets
  }

  const radius =
    (ringWidth * Math.max(1, maxDepth - focusDepth)) /
    (1 - hubScale(focusDepth) / Math.max(1, maxDepth))

  const reference = ringOptions(1, maxDepth, radius).ringWidth
  const maxExpanded = reference + hoverGrowForPathSegment(popOut, reference, 1)

  const segmentGrow = hoverGrowForPathSegment(
    popOut,
    ringWidth,
    Math.max(1, hovered.depth - focusDepth),
  )

  for (const arc of arcs) {
    const sector = sectors.get(arc.id)

    if (sector !== undefined && arc.depth > focusDepth && onPath(arc, hovered)) {
      targets.set(
        arc.id,
        sector.thickness >= maxExpanded ? 0 : Math.min(segmentGrow, maxExpanded - sector.thickness),
      )
    }
  }

  return targets
}

export type ArcKind = 'a' | 'p' | 'l'

const classOf = (kind: ArcKind, index: number): string =>
  kind === 'l' ? `bk-sb-l-${index}` : `bk-sb-${kind}${index}`

export function createPushWriter() {
  const desired = new WeakMap<HTMLElement, Map<string, string>>()
  const KEY_SEP = ' '

  const writeOn = (element: SVGElement, name: string, value: string | undefined): void => {
    if (value === undefined) {
      element.removeAttribute(name)
    } else {
      element.setAttribute(name, value)
    }
  }

  const applyOn = (
    host: HTMLElement,
    cls: string,
    name: string,
    value: string | undefined,
  ): void => {
    for (const element of host.querySelectorAll<SVGElement>(`.${cls}`)) {
      writeOn(element, name, value)
    }
  }

  /** Re-applies the wanted vars and flags after the sector layer painted: its elements are created by the scene, not by hover. */
  const reapplyPush = (host: HTMLElement | null): void => {
    const wanted = host === null ? undefined : desired.get(host)

    if (host !== null && wanted !== undefined) {
      for (const [key, value] of wanted) {
        const [kind = 'a', index = '0', name = ''] = key.split(KEY_SEP)
        applyOn(
          host,
          classOf(kind === 'p' || kind === 'l' ? kind : 'a', Number(index)),
          name,
          value,
        )
      }
    }
  }

  const setOn = (
    host: HTMLElement,
    kind: ArcKind,
    index: number,
    name: string,
    value: string | null,
  ): void => {
    const wanted = desired.get(host) ?? new Map<string, string>()
    desired.set(host, wanted)
    const key = [kind, index, name].join(KEY_SEP)

    if (wanted.get(key) === (value ?? undefined)) {
      return
    }

    if (value === null) {
      wanted.delete(key)
    } else {
      wanted.set(key, value)
    }

    applyOn(host, classOf(kind, index), name, value ?? undefined)
  }

  /** Makes the elements of `indexes` (arc indexes of one kind) the only ones carrying the attribute `name`. */
  const setFlag = (
    host: HTMLElement,
    kind: ArcKind,
    name: string,
    indexes: Iterable<number>,
  ): void => {
    const wanted = new Set(indexes)

    for (const key of desired.get(host)?.keys() ?? []) {
      const [keyKind, index = '0', keyName] = key.split(KEY_SEP)

      if (keyKind === kind && keyName === name && !wanted.has(Number(index))) {
        setOn(host, kind, Number(index), name, null)
      }
    }

    for (const index of wanted) {
      setOn(host, kind, index, name, '')
    }
  }

  return { reapplyPush, setFlag }
}
