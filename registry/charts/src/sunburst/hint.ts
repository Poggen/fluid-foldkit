import type { NativeContent } from './content'
import type { ArcDatum, Focus } from './arcs'
import type { SunburstCarrier } from './carriers'

export interface SunburstHintContext {
  hintText: string
  hoveredArc: ArcDatum | null
  focus: Focus
}

export interface SunburstHintProps {
  className?: string
  children?: NativeContent | ((context: SunburstHintContext) => NativeContent)
}

export const SunburstHint: (props?: SunburstHintProps) => SunburstCarrier = (
  props: SunburstHintProps = {},
) =>
  ({
    role: 'hint',
    props,
  }) satisfies SunburstCarrier

export const hintTextFor: (arc: ArcDatum | null, focus: Focus) => string = (
  arc: ArcDatum | null,
  focus: Focus,
) =>
  arc === null
    ? focus.depth === 0
      ? 'Click a segment to zoom in · hover to inspect'
      : 'Click the center to zoom out'
    : arc.trail.join('  ›  ')
