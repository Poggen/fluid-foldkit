import type { ChartGradient, ChartLinearGradient, ChartRadialGradient } from '@tanstack/charts'
import { isNumber, leadingFloat } from './guards'

const unit: (value: Length | undefined, fallback: number) => number = function unit(
  value: Length | undefined,
  fallback: number,
) {
  if (value === undefined) {
    return fallback
  }

  if (isNumber(value)) {
    return Number.isFinite(value) ? value : fallback
  }

  const trimmed = value.trim()
  const parsed = leadingFloat(trimmed)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return trimmed.endsWith('%') ? parsed / 100 : parsed
}

const stopsOf: (
  props: GradientOwnProps,
  defaults?: readonly [string, string],
) => ChartGradient['stops'] = function stopsOf(
  props: GradientOwnProps,
  defaults?: readonly [string, string],
) {
  const authored: Array<AuthoredStop> = []

  for (const child of props.children ?? []) {
    if (child.stopColor === undefined) {
      continue
    }

    const stop: AuthoredStop = { offset: unit(child.offset, 0), color: child.stopColor }

    if (child.stopOpacity !== undefined) {
      stop.opacity = child.stopOpacity
    }

    authored.push(stop)
  }

  if (authored.length > 0) {
    return authored
  }

  return [
    {
      offset: unit(props.fromOffset, 0),
      color: props.from ?? defaults?.[0] ?? 'currentColor',
      opacity: unit(props.fromOpacity, 1),
    },
    {
      offset: unit(props.toOffset, 1),
      color: props.to ?? defaults?.[1] ?? 'currentColor',
      opacity: unit(props.toOpacity, 1),
    },
  ]
}

const rotationOf: (props: GradientOwnProps) => number = function rotationOf(
  props: GradientOwnProps,
) {
  const raw =
    props.transform === undefined
      ? props.rotate
      : /rotate\(\s*(?<angle>-?[\d.]+)/u.exec(props.transform)?.groups?.angle

  return raw === undefined ? 0 : Number(raw)
}

const rotateAboutOrigin: (x: number, y: number, degrees: number) => [number, number] =
  function rotateAboutOrigin(x: number, y: number, degrees: number) {
    const a = (degrees * Math.PI) / 180

    return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
  }

const linear: (
  props: LinearGradientProps,
  defaults?: readonly [string, string],
) => ChartLinearGradient = function linear(
  props: LinearGradientProps,
  defaults?: readonly [string, string],
) {
  const explicit = [props.x1, props.y1, props.x2, props.y2].some(
    (v) => v !== undefined && v !== 0 && v !== '0',
  )

  const vertical = props.vertical !== false && !explicit
  let x1 = vertical ? 0 : unit(props.x1, 0)
  let y1 = vertical ? 0 : unit(props.y1, 0)
  let x2 = vertical ? 0 : unit(props.x2, 1)
  let y2 = vertical ? 1 : unit(props.y2, 0)
  const degrees = rotationOf(props)

  if (Number.isFinite(degrees) && degrees !== 0) {
    ;[x1, y1] = rotateAboutOrigin(x1, y1, degrees)
    ;[x2, y2] = rotateAboutOrigin(x2, y2, degrees)
  }

  return { id: props.id, type: 'linear', x1, y1, x2, y2, stops: stopsOf(props, defaults) }
}

const radial: (props: RadialGradientProps) => ChartRadialGradient = function radial(
  props: RadialGradientProps,
) {
  const gradient: ChartRadialGradient = {
    id: props.id,
    type: 'radial',
    cx: unit(props.cx, 0.5),
    cy: unit(props.cy, 0.5),
    r: unit(props.r, 0.5),
    stops: stopsOf(props),
  }

  if (props.fx !== undefined) {
    gradient.fx = unit(props.fx, 0.5)
  }

  if (props.fy !== undefined) {
    gradient.fy = unit(props.fy, 0.5)
  }

  return gradient
}

/** Source ChildTable order: first carrier role, then declarations within that role. */
export const userGradients: (children: ReadonlyArray<GradientLayer>) => Array<ChartGradient> =
  function userGradients(children: ReadonlyArray<GradientLayer>) {
    const roles = new Map<GradientCarrierRole, Array<ChartGradient>>()

    for (const child of children) {
      const role = child.carrierRole ?? 'customGradient'
      const existing = roles.get(role)

      if (existing === undefined) {
        roles.set(role, [child.props])
      } else {
        existing.push(child.props)
      }
    }

    return [...roles.values()].flat()
  }

export interface GradientChildStop {
  readonly offset?: string | number
  readonly stopColor?: string
  readonly stopOpacity?: number
}

export type GradientCarrierRole =
  | 'linearGradient'
  | 'radialGradient'
  | `gradientPreset:${PresetName}`
  | 'customGradient'

export interface GradientLayer {
  readonly kind: 'gradient'
  /** Omitted only for manually authored native resources, grouped as customGradient. */
  readonly carrierRole?: GradientCarrierRole
  readonly props: ChartGradient
}

type Length = string | number

/** A color stop of a gradient. */
export interface GradientStop {
  /** Position along the gradient from 0 to 1. */
  readonly offset: number
  /** Color at that position. */
  readonly color: string
}

interface GradientOwnProps {
  readonly id: string

  readonly from?: string

  readonly to?: string

  readonly fromOffset?: Length

  readonly toOffset?: Length

  readonly fromOpacity?: Length

  readonly toOpacity?: Length

  readonly rotate?: number | string

  readonly transform?: string

  readonly children?: ReadonlyArray<GradientChildStop>

  readonly svgAttributes?: Readonly<Record<string, string | number | boolean>>
}

interface LinearGradientOwnProps extends GradientOwnProps {
  /**
   * Start x of the gradient vector, as a fraction or a percentage.
   * @default 0
   */
  readonly x1?: Length
  /**
   * Start y of the gradient vector.
   * @default 0
   */
  readonly y1?: Length
  /**
   * End x of the gradient vector.
   * @default 1
   */
  readonly x2?: Length
  /**
   * End y of the gradient vector.
   * @default 0
   */
  readonly y2?: Length
  /**
   * Run the gradient from top to bottom. Ignored when any of `x1`, `y1`, `x2`, `y2` is set to a non-zero value.
   * @default true
   */
  readonly vertical?: boolean
}

export type LinearGradientProps = LinearGradientOwnProps

interface RadialGradientOwnProps extends GradientOwnProps {
  /**
   * Center x of the outer circle, as a fraction or a percentage.
   * @default 0.5
   */
  readonly cx?: Length
  /**
   * Center y of the outer circle.
   * @default 0.5
   */
  readonly cy?: Length
  /**
   * Radius of the outer circle.
   * @default 0.5
   */
  readonly r?: Length
  /** Focal point x. The focal point is the center when omitted. */
  readonly fx?: Length
  /** Focal point y. The focal point is the center when omitted. */
  readonly fy?: Length
}

/**
 * Props of `RadialGradient`: the gradient options below plus any SVG `radialGradient` attribute. Attributes without a chart equivalent are accepted and ignored.
 */
export type RadialGradientProps = RadialGradientOwnProps

interface AuthoredStop {
  offset: number
  color: string
  opacity?: number
}

/**
 * Declares a linear gradient that chart elements reference as `fill="url(#id)"`. Place it as a child of the chart. It renders nothing itself.
 */
export const LinearGradient: (props: LinearGradientProps) => GradientLayer = (
  props: LinearGradientProps,
) => ({
  kind: 'gradient',
  carrierRole: 'linearGradient',
  props: linear(props),
})

/**
 * Declares a radial gradient that chart elements reference as `fill="url(#id)"`. Place it as a child of the chart. It renders nothing itself.
 */
export const RadialGradient: (props: RadialGradientProps) => GradientLayer = (
  props: RadialGradientProps,
) => ({
  kind: 'gradient',
  carrierRole: 'radialGradient',
  props: radial(props),
})

const PRESETS: Record<
  | 'GradientDarkgreenGreen'
  | 'GradientLightgreenGreen'
  | 'GradientOrangeRed'
  | 'GradientPinkBlue'
  | 'GradientPinkRed'
  | 'GradientPurpleOrange'
  | 'GradientPurpleTeal'
  | 'GradientSteelPurple'
  | 'GradientTealBlue',
  readonly [string, string]
> = {
  GradientDarkgreenGreen: ['#184E86', '#57CA85'],
  GradientLightgreenGreen: ['#42E695', '#3BB2B8'],
  GradientOrangeRed: ['#FCE38A', '#F38181'],
  GradientPinkBlue: ['#F02FC2', '#6094EA'],
  GradientPinkRed: ['#F54EA2', '#FF7676'],
  GradientPurpleOrange: ['#7117EA', '#EA6060'],
  GradientPurpleTeal: ['#5B247A', '#1BCEDF'],
  GradientSteelPurple: ['#65799B', '#5E2563'],
  GradientTealBlue: ['#17EAD9', '#6078EA'],
} satisfies Record<string, readonly [string, string]>

type PresetName = keyof typeof PRESETS

const preset = (name: PresetName) => (props: LinearGradientProps) =>
  ({
    kind: 'gradient',
    carrierRole: `gradientPreset:${name}`,
    props: linear(props, PRESETS[name]),
  }) satisfies GradientLayer

/**
 * Two-stop linear gradient preset from dark blue (#184E86) to green (#57CA85). Reference it as `fill="url(#your-id)"`. Accepts the `LinearGradient` props, and `from` / `to` override the preset colors.
 */
export const GradientDarkgreenGreen =
  // @__PURE__
  preset('GradientDarkgreenGreen')

/**
 * Two-stop linear gradient preset from light green (#42E695) to teal (#3BB2B8). Reference it as `fill="url(#your-id)"`. Accepts the `LinearGradient` props, and `from` / `to` override the preset colors.
 */
export const GradientLightgreenGreen =
  // @__PURE__
  preset('GradientLightgreenGreen')

/**
 * Two-stop linear gradient preset from yellow (#FCE38A) to red (#F38181). Reference it as `fill="url(#your-id)"`. Accepts the `LinearGradient` props, and `from` / `to` override the preset colors.
 */
export const GradientOrangeRed =
  // @__PURE__
  preset('GradientOrangeRed')

/**
 * Two-stop linear gradient preset from pink (#F02FC2) to blue (#6094EA). Reference it as `fill="url(#your-id)"`. Accepts the `LinearGradient` props, and `from` / `to` override the preset colors.
 */
export const GradientPinkBlue =
  // @__PURE__
  preset('GradientPinkBlue')

/**
 * Two-stop linear gradient preset from pink (#F54EA2) to red (#FF7676). Reference it as `fill="url(#your-id)"`. Accepts the `LinearGradient` props, and `from` / `to` override the preset colors.
 */
export const GradientPinkRed =
  // @__PURE__
  preset('GradientPinkRed')

/**
 * Two-stop linear gradient preset from purple (#7117EA) to orange (#EA6060). Reference it as `fill="url(#your-id)"`. Accepts the `LinearGradient` props, and `from` / `to` override the preset colors.
 */
export const GradientPurpleOrange =
  // @__PURE__
  preset('GradientPurpleOrange')

/**
 * Two-stop linear gradient preset from purple (#5B247A) to teal (#1BCEDF). Reference it as `fill="url(#your-id)"`. Accepts the `LinearGradient` props, and `from` / `to` override the preset colors.
 */
export const GradientPurpleTeal =
  // @__PURE__
  preset('GradientPurpleTeal')

/**
 * Two-stop linear gradient preset from steel (#65799B) to purple (#5E2563). Reference it as `fill="url(#your-id)"`. Accepts the `LinearGradient` props, and `from` / `to` override the preset colors.
 */
export const GradientSteelPurple =
  // @__PURE__
  preset('GradientSteelPurple')

/**
 * Two-stop linear gradient preset from teal (#17EAD9) to blue (#6078EA). Reference it as `fill="url(#your-id)"`. Accepts the `LinearGradient` props, and `from` / `to` override the preset colors.
 */
export const GradientTealBlue =
  // @__PURE__
  preset('GradientTealBlue')
