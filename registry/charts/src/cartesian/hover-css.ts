import { focusEmptyHiddenCss } from './gate-css'
import { FOCUS_LAYERS, keyStarts } from '../kit/renderer-dom'
import { NOT_MOTION } from '../kit/renderer-dom'

const splitTopLevel: (select: string) => Array<string> = function splitTopLevel(select: string) {
  const parts: Array<string> = []
  let depth = 0
  let start = 0

  for (let i = 0; i < select.length; i += 1) {
    const ch = select[i]

    if (ch === '(' || ch === '[') {
      depth += 1
    }

    if (ch === ')' || ch === ']') {
      depth -= 1
    }

    if (ch === ',' && depth === 0) {
      parts.push(select.slice(start, i).trim())
      start = i + 1
    }
  }

  parts.push(select.slice(start).trim())

  return parts.filter(Boolean)
}

const markerDimRules: (scope: string, argument1: MarkerDimRule) => Array<string> =
  function markerDimRules(scope: string, { select, marker }: MarkerDimRule) {
    const filter = marker.blur > 0 ? `blur(${marker.blur}px)` : 'none'
    const dimmed = `--bkm-series-opacity:${marker.opacity};--bkm-series-filter:${filter}`
    const noAnimation = marker.animate ? '' : ';--bkm-marker-animation:none'

    return [
      `${scope}[data-bkm-hover]:not([data-bkm-evt], .bkm-evt:hover) ${select}{${dimmed}}`,
      `${scope}[data-bkm-hover][data-bkm-evt]:not(:has(.bkm-evt:hover)) ${select}{${dimmed}}`,
      `${scope} ${select}{--bkm-enter-blur:${marker.enterBlur}${noAnimation}}`,
    ]
  }

const seriesDimRules: (
  scope: string,
  on: string,
  dim: ReadonlyArray<HoverDimRule>,
) => Array<string> = function seriesDimRules(
  scope: string,
  on: string,
  dim: ReadonlyArray<HoverDimRule>,
) {
  return dim.flatMap((rule) => {
    if (rule.marker) {
      return markerDimRules(scope, { ...rule, marker: rule.marker })
    }

    const live = splitTopLevel(rule.select)
      .map((part) => `${scope} ${part}${NOT_MOTION}`)
      .join(',')

    return [
      `${live}{--bkm-series-transition:opacity .4s ease-in-out}`,
      `${on} ${rule.select}{--bkm-series-opacity:${rule.opacity}}`,
    ]
  })
}

const legendDimRules: (scope: string, dim: ReadonlyArray<HoverDimRule>) => Array<string> =
  function legendDimRules(scope: string, dim: ReadonlyArray<HoverDimRule>) {
    return dim.flatMap(({ series, legendOpacity, marker, select }) => {
      if (series === undefined || legendOpacity === undefined) {
        return []
      }

      const blur = marker && marker.blur > 0 ? `;--bkm-series-filter:blur(${marker.blur}px)` : ''

      return [
        `${scope}[data-bkm-legend]:not([data-bkm-legend="${series}"]) ${select}{--bkm-series-opacity:${legendOpacity}${blur}}`,
      ]
    })
  }

const highlightRules: (
  scope: string,
  on: string,
  highlights: ReadonlyArray<HoverHighlight>,
  bandClip: string,
) => Array<string> = function highlightRules(
  scope: string,
  on: string,
  highlights: ReadonlyArray<HoverHighlight>,
  bandClip: string,
) {
  return highlights.flatMap((hl) => [
    `${scope} ${hl.select}{--bkm-series-opacity:0;--bkm-series-clip-path:url(#${bandClip})}`,
    `${on} ${hl.select}{--bkm-series-opacity:1}`,
    `${on} ${hl.select}${NOT_MOTION}{--bkm-series-transition:opacity .4s ease-in-out}`,
  ])
}

const segmentRules: (scope: string, segmentLeft: number) => Array<string> = function segmentRules(
  scope: string,
  segmentLeft: number,
) {
  const band = bandOf('--bkm-hl0', '--bkm-hl1')
  const bandKey = segmentKey('segment-band')
  const shift: (v: string) => string = (v: string) =>
    `translateX(calc((var(${v},0) - ${segmentLeft}) * 1px))`

  return [
    `${scope} ${bandKey}{--bkm-series-opacity:0;--bkm-series-clip-path:${band}}`,
    `${scope} ${bandKey}${NOT_MOTION}{--bkm-series-transition:opacity .15s ease-out}`,
    `${scope}[data-bkm-segon] ${bandKey}{--bkm-series-opacity:1}`,
    `${scope} ${SEGMENT_EDGES}{--bkm-series-opacity:0}`,
    `${scope}[data-bkm-segon] ${SEGMENT_EDGES}{--bkm-series-opacity:1}`,
    `${scope} ${segmentKey('segment-edge-0')}{--bkm-series-transform:${shift('--bkm-hl0')}}`,
    `${scope} ${segmentKey('segment-edge-1')}{--bkm-series-transform:${shift('--bkm-hl1')}}`,
  ]
}

const profitLossRules: (scope: string, pl: ReadonlyArray<ProfitLossRule>) => Array<string> =
  function profitLossRules(scope: string, pl: ReadonlyArray<ProfitLossRule>) {
    const hovering: (sign: 0 | 1) => Array<string> = (sign: 0 | 1) => [
      `${scope}[data-bkm-pl="${sign}"]`,
      `${scope}[data-bkm-plf="${sign}"]:not([data-bkm-pl])`,
    ]

    return pl.flatMap((rule) => {
      if (rule.kind === 'dim') {
        const off = hovering(rule.sign === 0 ? 1 : 0)
        const live = `${rule.select}${NOT_MOTION}`

        return [
          `${within(off, live)}{--bkm-series-transition:opacity .2s ease-in-out}`,
          `${within(off, rule.select)}{--bkm-series-opacity:.25}`,
        ]
      }

      const g = `linearGradient[id$="${rule.gradient}"] stop`
      const positiveStops = `${g}:nth-child(n+3)`
      const negativeStops = `${g}:nth-child(-n+2)`

      return [
        `${scope} ${g}{--bkm-series-transition:stop-opacity .2s ease-in-out}`,
        `${within(hovering(0), positiveStops)}{--bkm-series-stop-opacity:.25}`,
        `${within(hovering(1), negativeStops)}{--bkm-series-stop-opacity:.25}`,
      ]
    })
  }

/** Fixed-text CSS for the cartesian hover visuals, keyed on host attributes (`data-bkm-hover/-drag/-settle/-legend/-pl`) and `--bkm-hl0/1`; it changes only with the definition.
 * Selectors from kit/renderer-dom.ts address marks by mark id. Reads only. */
export const hoverStaticCss: (scope: string, hover: HoverVisuals) => string =
  function hoverStaticCss(scope: string, hover: HoverVisuals) {
    const on = `${scope}:is([data-bkm-hover],[data-bkm-drag])`

    return [
      focusHiddenRule(scope),
      ...seriesDimRules(scope, on, hover.dim),
      ...legendDimRules(scope, hover.dim),
      ...highlightRules(scope, on, hover.highlights, hover.bandClip),
      ...(hover.segmentLeft === null ? [] : segmentRules(scope, hover.segmentLeft)),
      ...profitLossRules(scope, hover.pl),
    ].join('')
  }

/** Hover dim of every series (bklit SeriesHoverDim). */
export interface HoverDimRule {
  readonly select: string
  readonly opacity: number
  /** Series index (legend row) this rule belongs to, and the opacity it takes while another legend row is hovered. */
  readonly series?: number
  readonly legendOpacity?: number
  /** Point-marker rule (bklit SeriesMarkersDimWrapper): `opacity` and `blur` (px) apply on chart hover and on legend dim; `enterBlur` is the entrance blur, `animate` false drops the entrance. */
  readonly marker?: {
    readonly opacity: number
    readonly blur: number
    readonly enterBlur: number
    readonly animate: boolean
  }
}

/** ProfitLossLine legend emphasis: a single-sign line dims by group opacity, a mixed line fades the other sign's gradient stops. */
export type ProfitLossRule =
  | { readonly kind: 'dim'; readonly select: string; readonly sign: 0 | 1 }
  | { readonly kind: 'stops'; readonly gradient: string }

export interface HoverHighlight {
  readonly select: string
}

export interface HoverVisuals {
  readonly dim: ReadonlyArray<HoverDimRule>
  readonly highlights: ReadonlyArray<HoverHighlight>
  readonly pl: ReadonlyArray<ProfitLossRule>
  /** Row x values (ms) the highlight band is cut from (one row either side of the focus). */
  readonly times: ReadonlyArray<number>
  /** Per row (aligned with `times`): the ProfitLossLine sign at that row, 0 profit / 1 loss, null without one. bklit dims the other sign on chart hover too. */
  readonly plSigns: ReadonlyArray<0 | 1 | null>
  /** Segment* children present: the left plot margin the drag rules are translated from (px), else null. */
  readonly segmentLeft: number | null
  /** Id of the owned `<clipPath>` (`HighlightBandClip`) the highlight paths are clipped by. */
  readonly bandClip: string
}

const bandOf: (v0: string, v1: string) => string = (v0: string, v1: string) =>
  `polygon(calc(var(${v0},0) * 1px) -100%,calc(var(${v1},0) * 1px) -100%,calc(var(${v1},0) * 1px) 200%,calc(var(${v0},0) * 1px) 200%) view-box`

const focusHiddenRule: (scope: string) => string = (scope: string) =>
  focusEmptyHiddenCss(scope, ':not([data-bkm-hover]):not([data-bkm-drag])', FOCUS_LAYERS)

type MarkerDimRule = HoverDimRule & { readonly marker: NonNullable<HoverDimRule['marker']> }

const SEGMENT_EDGES = keyStarts('segment-edge-')

const segmentKey: (id: string) => string = (id: string) => keyStarts(`${id}:`)

const within: (roots: ReadonlyArray<string>, tail: string) => string = (
  roots: ReadonlyArray<string>,
  tail: string,
) => roots.map((root) => `${root} ${tail}`).join(',')
