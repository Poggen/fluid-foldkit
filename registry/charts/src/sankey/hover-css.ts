// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
import { keyEnds, keyIs, keyStarts } from '../kit/renderer-dom'

// Sankey hover is static scoped CSS: per-index `--bkm-sk-dim` / `--bkm-sk-hot` rules edited in place through the CSSOM, never chart state or renderer-owned DOM.
// Transitions carry NOT_MOTION; a phase epsilon keeps CSS from reversing a transition (bklit restarts over the full duration).
const HOVER_STROKE_BOOST = 1.3

const HOST = '[data-bkm-chart="sankey"]'

/** Per-index rules scoped to one chart (`data-bkm-sk-id` on its host): node rules (index `i`), then flow rules (`counts.nodes + i`), every value at rest; rendered once, the writer edits declarations in place.
 */
const sankeyIndexCss = (
  id: string,
  counts: { readonly nodes: number; readonly links: number },
): string => {
  const host = `${HOST}[data-bkm-sk-id="${id}"]`
  let css = ''

  for (let i = 0; i < counts.nodes; i += 1) {
    css += `${host} :is(g${keyIs(`sankey:sankey-node-${i}`)},g${keyStarts(`sankey:sankey-node-${i}-role-`)},g${keyStarts('sankey:nlabel')} > text${keyEnds(`:number:${i}`)},g${keyStarts('sankey:vlabel')} > text${keyEnds(`:number:${i}`)}){--bkm-sk-dim:0}`
  }

  for (let i = 0; i < counts.links; i += 1) {
    css += `${host} g${keyStarts('sankey:flow')} > path${keyEnds(`:number:${i}`)}{--bkm-sk-dim:0;--bkm-sk-hot:0}`
  }

  return css
}

/** Static paint belongs to the chart root utilities. */
const sankeyHoverCss = (): string => ''

interface SankeyHoverVars {
  readonly '--bkm-sk-lf': number
  readonly '--bkm-sk-lh': number
  readonly '--bkm-sk-lo': number
  readonly '--bkm-sk-nf': number
}

/** Per-host custom properties from the faded / rest opacities (props, not hover state). */
const sankeyHoverVars = (
  fadedNode: number,
  fadedLink: number,
  strokeOpacity: number,
): SankeyHoverVars => ({
  '--bkm-sk-lf': fadedLink,
  '--bkm-sk-lh': Math.min(1, strokeOpacity * HOVER_STROKE_BOOST),
  '--bkm-sk-lo': strokeOpacity,
  '--bkm-sk-nf': fadedNode,
})

interface SankeyLinkRef {
  readonly source: number
  readonly target: number
}

type SankeyHoverFocus = { readonly node: number } | { readonly link: number }

interface SankeyHoverSets {
  readonly nodes: ReadonlyArray<number>
  readonly links: ReadonlyArray<number>
}

/** The active node / flow indices for a focused node (itself, its flows and their far ends) or a focused flow (it and its two ends). */
const sankeyHoverSets = (
  links: ReadonlyArray<SankeyLinkRef>,
  focus: SankeyHoverFocus,
): SankeyHoverSets => {
  const nodes = new Set<number>()
  const flows: Array<number> = []

  if ('node' in focus) {
    nodes.add(focus.node)

    for (const [index, row] of links.entries()) {
      if (row.source === focus.node || row.target === focus.node) {
        flows.push(index)
        nodes.add(row.source)
        nodes.add(row.target)
      }
    }
  } else {
    const row = links.at(focus.link)

    if (row !== undefined) {
      flows.push(focus.link)
      nodes.add(row.source)
      nodes.add(row.target)
    }
  }

  return { links: flows, nodes: [...nodes] }
}

const EPSILON = 0.0002

const PHASES = 3

const FLOW_FADED = 1

const FLOW_HOT = 2

const flowState = (hovered: boolean, active: boolean): number => {
  if (!hovered) {
    return 0
  }

  return active ? FLOW_HOT : FLOW_FADED
}

interface Slot {
  /** Node: 1 dimmed. Flow: 0 rest, 1 faded, 2 hot (the value-distinct states). */
  state: number
  phase: number
}

/** Per-chart memory of each index's last written state, so a hover change edits only the rules whose own state changed. */
interface SankeyHoverWriter {
  write: (
    sheet: CSSStyleSheet | null,
    sets: SankeyHoverSets | null,
    counts: { readonly nodes: number; readonly links: number },
  ) => void
}

const slotOf = (list: Array<Slot>, index: number): Slot => (list[index] ??= { phase: 0, state: 0 })

// The fraction of a state with its phase nudge: the state's own end (0 or 1) pulled in by phase * EPSILON.
const fraction = (on: boolean, phase: number): string =>
  String(on ? 1 - phase * EPSILON : phase * EPSILON)

const advance = (slot: Slot, state: number): boolean => {
  if (slot.state === state) {
    return false
  }

  slot.state = state
  slot.phase = (slot.phase + 1) % PHASES

  return true
}

const ruleAt = (sheet: CSSStyleSheet, index: number): CSSStyleDeclaration | null => {
  const rule = sheet.cssRules[index]

  return rule instanceof CSSStyleRule ? rule.style : null
}

const createSankeyHoverWriter = (): SankeyHoverWriter => {
  let nodes: Array<Slot> = []
  let flows: Array<Slot> = []
  let current: CSSStyleSheet | null = null
  let nodeCount = -1,
    linkCount = -1

  return {
    write: (sheet, sets, counts) => {
      if (sheet === null) {
        return
      }

      // A new sheet (remount, text change) starts every rule at rest.
      if (sheet !== current || counts.nodes !== nodeCount || counts.links !== linkCount) {
        nodeCount = counts.nodes
        linkCount = counts.links
        current = sheet
        nodes = []
        flows = []
      }

      const activeNodes = new Set<number>(sets?.nodes)
      const activeFlows = new Set<number>(sets?.links)
      const hovered = sets !== null

      for (let index = 0; index < counts.nodes; index += 1) {
        const slot = slotOf(nodes, index)

        if (advance(slot, hovered && !activeNodes.has(index) ? 1 : 0)) {
          ruleAt(sheet, index)?.setProperty('--bkm-sk-dim', fraction(slot.state === 1, slot.phase))
        }
      }

      for (let index = 0; index < counts.links; index += 1) {
        const slot = slotOf(flows, index)
        const state = flowState(hovered, activeFlows.has(index))

        if (advance(slot, state)) {
          const rule = ruleAt(sheet, counts.nodes + index)
          rule?.setProperty('--bkm-sk-dim', fraction(state === FLOW_FADED, slot.phase))
          rule?.setProperty('--bkm-sk-hot', fraction(state === FLOW_HOT, slot.phase))
        }
      }
    },
  }
}

export { createSankeyHoverWriter, sankeyHoverCss, sankeyHoverSets, sankeyHoverVars, sankeyIndexCss }

export type { SankeyHoverFocus }
