import { NOT_MOTION, keyStarts } from '../kit/renderer-dom'

const indexDimRules: (
  scope: string,
  count: number,
  select: string,
  keep: (index: number) => string,
  declarations: string,
) => Array<string> = function indexDimRules(
  scope: string,
  count: number,
  select: string,
  keep: (index: number) => string,
  declarations: string,
) {
  const rules: Array<string> = []

  for (let i = 0; i < count; i += 1) {
    rules.push(`${scope}[data-hover="${i}"] ${select}:not(${keep(i)}){${declarations}}`)
  }

  return rules
}

const tickRules: (scope: string, tick: TickFade, count: number) => Array<string> =
  function tickRules(scope: string, tick: TickFade, count: number) {
    const rules = [
      `${scope} text${keyStarts(tick.prefix)}${NOT_MOTION}{--bkm-bar-transition:opacity ${tick.ms}ms ease-in-out,fill ${tick.ms}ms ease-in-out}`,
    ]

    if (tick.ramp !== undefined) {
      rules.push(
        typedAttr(
          `${scope}[data-hover] text${keyStarts(tick.prefix)}{--bkm-bar-opacity:clamp(0,calc((abs(attr(x type(<number>)) - var(${FOCUS_X_VAR},-9999)) - ${tick.ramp}) / 20),1)!important}`,
        ),
      )

      return rules
    }

    for (const [index, pos] of tick.positions.slice(0, count).entries()) {
      if (pos >= 0) {
        rules.push(
          `${scope}[data-hover="${index}"] text${keyStarts(tick.prefix)}:nth-child(${pos + 1}){--bkm-bar-opacity:1!important;--bkm-bar-fill:var(--bkm-foreground)!important}`,
        )
      }
    }

    return rules
  }

/** The bar emphasis stylesheet: one rule per category the data has; depends on targets, category count and ticks, never on focus (host attrs `data-hover`, `data-legend`).
 * The focused category's tick label fades out (the date pill replaces it). */
export const barDimCss: (
  scope: string,
  targets: ReadonlyArray<HoverTarget>,
  tick: TickFade | null,
  count: number,
) => string = function barDimCss(
  scope: string,
  targets: ReadonlyArray<HoverTarget>,
  tick: TickFade | null,
  count: number,
) {
  const rules: Array<string> = []

  for (const target of targets) {
    if (target.legendOnly !== true) {
      const transition =
        target.snap === true
          ? 'none'
          : `opacity ${HOVER_TRANSITION_MS}ms ${target.easing ?? 'ease-in-out'}`

      rules.push(`${scope} ${target.select}${NOT_MOTION}{--bkm-bar-transition:${transition}}`)

      if (target.keep === null) {
        rules.push(
          `${scope}[data-hover] ${target.select}{--bkm-bar-opacity:${target.dim}!important}`,
        )
      } else {
        rules.push(
          ...indexDimRules(
            scope,
            count,
            target.select,
            target.keep,
            `--bkm-bar-opacity:${target.dim}!important`,
          ),
        )
      }
    }

    if (target.seriesIndex !== undefined && target.snap !== true) {
      rules.push(
        `${scope}[data-legend]:not([data-hover]):not([data-legend="${target.seriesIndex}"]) ${target.select}{--bkm-bar-opacity:${target.dim}!important}`,
      )
    }
  }

  if (tick) {
    rules.push(...tickRules(scope, tick, count))
  }

  return rules.join('')
}

const typedAttr: (css: string) => string = (css: string) =>
  `@supports (opacity: attr(opacity type(<number>), 1)){${css}}`

export interface HoverTarget {
  /** Selector for every leaf node of the mark (relative to the chart root). */
  readonly select: string
  /** Selector matching the nodes of category `index` (kept at rest opacity), or null to dim the whole mark. */
  readonly keep: ((index: number) => string) | null
  /** Opacity of the dimmed nodes while any category is focused. */
  readonly dim: number
  /** True for marks bklit snaps (no opacity fade): the column track. */
  readonly snap?: boolean
  /** CSS easing of the dim fade (default ease-in-out, bklit's bar/tick CSS transition); squares use motion's opacity tween, ease-out. */
  readonly easing?: string
  /** Series index the nodes belong to: a legend hover dims every target of another series. */
  readonly seriesIndex?: number
  /** Only used by the legend dim (the category hover has its own target for the same nodes). */
  readonly legendOnly?: boolean
}

export const cssAttr: (value: string) => string = (value: string) =>
  value.replaceAll(/["\\\n]/gu, String.raw`\$&`)

/** Class on every node of category `index` for marks we author (squares, track, depth): selectable without the key encoding. */
export const barIndexClass: (index: number) => string = (index: number) => `bkm-bi${index}`

const HOVER_TRANSITION_MS = 150

/** Host var: the focused category's centre x (svg px) for the vertical bar tick fade. */
export const FOCUS_X_VAR = '--bkm-bfx'

export interface TickFade {
  readonly prefix: string
  /** Vertical bars: half-width of the hidden zone around the focused band centre; undefined for the horizontal label highlight. */
  readonly ramp?: number
  readonly ms: number
  /** Position of each category's tick label among the drawn labels (-1: not drawn). */
  readonly positions: ReadonlyArray<number>
}
