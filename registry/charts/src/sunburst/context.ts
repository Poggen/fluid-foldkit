import type { ArcDatum, Focus, SunburstNode } from './arcs'
import { buildArcs } from './arcs'
import type { SunburstChartProps } from './props'
import type { State } from './block'

export interface SunburstStableContextValue<Action = void> {
  data: SunburstNode
  arcs: Array<ArcDatum>
  focusById: Map<string, Focus>
  rootId: string
  maxDepth: number
  size: number
  focus: Focus
  focusId: string
  zoomTo: (id: string) => Action
}

export interface SunburstHoverContextValue<Action = void> {
  hoveredArcIndex: number | null
  setHoveredArcIndex: (index: number | null) => Action
  hoveredArc: ArcDatum | null
  setHoveredArc: (arc: ArcDatum | null) => Action
}

export interface SunburstActions<Action = void> {
  readonly focus: (id: string | null) => Action
  readonly hover: (index: number | null) => Action
}

export function sunburstContext<Action>(
  props: SunburstChartProps,
  state: State,
  actions: SunburstActions<Action>,
): { stable: SunburstStableContextValue<Action>; hover: SunburstHoverContextValue<Action> } {
  const model = buildArcs(props.data),
    id = props.focusId ?? state.focusId ?? model.rootId,
    focus = model.focusById.get(id) ?? model.focusById.get(model.rootId)

  if (focus === undefined) throw new TypeError('Sunburst hierarchy requires root focus')

  const hoveredArcIndex =
      props.hoveredIndex === undefined ? state.hoveredIndex : props.hoveredIndex,
    hoveredArc = hoveredArcIndex === null ? null : (model.arcs.at(hoveredArcIndex) ?? null)

  return {
    stable: {
      ...model,
      data: props.data,
      size: props.size ?? 520,
      focus,
      focusId: focus.id,
      zoomTo: actions.focus,
    },
    hover: {
      hoveredArcIndex,
      hoveredArc,
      setHoveredArcIndex: actions.hover,
      setHoveredArc: (arc) => actions.hover(arc?.arcIndex ?? null),
    },
  }
}

export const useSunburstStable = <Action>(context: SunburstStableContextValue<Action>) => context

export const useSunburstHover = <Action>(context: SunburstHoverContextValue<Action>) => context
