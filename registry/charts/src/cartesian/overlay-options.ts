// Native typed options transposed from the pinned Bklit public contracts.
import type { ChartContent } from './content-types'
import type { CurveFactory } from 'd3-shape'
import type { SeriesPointMarkerStyle } from './series-options'

type FadeEdges = boolean | 'left' | 'right'

/** A point on a projection path. */
export interface ProjectionPoint {
  /** X position of the point. */
  readonly date: Readonly<Date>
  /** Y value of the point. */
  readonly value: number
}

/**
 * How a `ProjectionLine` is painted: `"solid"` uses one color, `"gradient"` blends from `gradientStart` to `gradientEnd` along the path.
 */
export type ProjectionStrokeStyle = 'solid' | 'gradient'

/**
 * Props of `ProjectionLine`: a forecast path drawn after the last data point, usually a dashed line from the last data row to a horizon point.
 */
export interface ProjectionLineProps {
  /**
   * Projection path points: the anchor (usually the last data row) followed by the horizon end. Needs at least two points to draw.
   */
  data: ReadonlyArray<ProjectionPoint>
  /**
   * Id of the y-scale group the path is drawn against.
   * @default "left"
   */
  yAxisId?: string | number
  /**
   * Stroke color of a solid path.
   * @default "var(--chart-3)"
   */
  stroke?: string
  /**
   * `"solid"` paints one color, `"gradient"` blends `gradientStart` into `gradientEnd` along the path.
   * @default "solid"
   */
  readonly strokeStyle?: ProjectionStrokeStyle
  /**
   * Gradient start color when `strokeStyle` is `"gradient"`.
   * @default `stroke`
   */
  readonly gradientStart?: string
  /**
   * Gradient end color when `strokeStyle` is `"gradient"`.
   * @default "var(--chart-5)"
   */
  readonly gradientEnd?: string
  /**
   * Stroke width in px.
   * @default 2
   */
  strokeWidth?: number
  /**
   * `"linear"` draws straight segments, `"bezier"` draws a smooth S-curve with horizontal tangents.
   * @default "linear"
   */
  readonly curveKind?: 'linear' | 'bezier'
  /** Accepted so bklit-ui code compiles. Not read: use `curveKind` to choose the shape. */
  readonly curve?: CurveFactory
  /**
   * SVG dash pattern of the path. Pass `"0"` for a solid path.
   * @default "6,4"
   */
  readonly strokeDasharray?: string
  /**
   * Stroke opacity of the path.
   * @default 1
   */
  readonly strokeOpacity?: number
  /**
   * Whether the horizon end reserves room for an end marker: the path stops short of the plot edge by the marker radius so it is not clipped. The marker dot itself is not drawn by this package.
   * @default true
   */
  readonly showEndMarker?: boolean
  /**
   * Deprecated alias of `showEndMarker`.
   * @deprecated Use showEndMarker.
   */
  readonly showEndpoints?: boolean
  /**
   * Radius in px of the end marker, used to keep the path inside the plot.
   * @default 5
   */
  readonly endpointRadius?: number
  /** Accepted so bklit-ui code compiles. Not read. */
  readonly className?: string
}

/** One `ProjectionLine` reduced to its y-scale group and points. */
export interface ProjectionLineConfig {
  /** Id of the y-scale group the projection is drawn against. */
  yAxisId: string
  /** Points of the projection path. */
  data: Array<ProjectionPoint>
}

/** Props of `ProjectionLineEndMarker`, the dot at the end of a projection path. Accepted so bklit-ui code compiles; this package does not draw the dot. */
export interface ProjectionLineEndMarkerProps {
  /** Projection path points; the marker sits on the last one. */
  data: ReadonlyArray<ProjectionPoint>
  /**
   * Id of the y-scale group the marker is drawn against.
   * @default "left"
   */
  yAxisId?: string | number
  /**
   * Marker color.
   * @default "var(--chart-3)"
   */
  stroke?: string
  /**
   * Marker opacity.
   * @default 1
   */
  readonly strokeOpacity?: number
  /**
   * Marker radius in px.
   * @default 5
   */
  readonly radius?: number
}

/**
 * Props of `LineSeriesTerminalMarker`, a ring on the last data point of a series; it is the usual anchor for a `ProjectionLine`.
 */
// bklit line-series-terminal-marker.tsx:8 LineSeriesTerminalMarkerProps.
export interface LineSeriesTerminalMarkerProps {
  /** Key of the series in the chart data. The ring sits on the last row's value. */
  readonly dataKey: string
  /**
   * Id of the y-scale group the series uses.
   * @default "left"
   */
  yAxisId?: string | number
  /**
   * Fill of the inner circle. No inner circle is drawn when omitted, `""` or `"transparent"`, which leaves a hollow ring.
   */
  readonly fill?: string
  /**
   * Radius of the inner circle in px.
   * @default 5
   */
  readonly radius?: number
  /**
   * Gap between the inner circle and the ring in px.
   * @default 0
   */
  readonly ringGap?: number
  /**
   * Ring color.
   * @default "var(--chart-1)"
   */
  stroke?: string
  /**
   * Ring stroke width in px.
   * @default 1.5
   */
  strokeWidth?: number
}

/** Props of `ProfitLossLine`, a single line that is green above zero and red below it. */
export interface ProfitLossLineProps {
  /**
   * Key of the numeric series in the chart data. Values at or above zero use `positiveColor`, values below use `negativeColor`.
   */
  readonly dataKey: string
  /** Accepted so bklit-ui code compiles. Not read: the line uses the chart's `xDataKey`. */
  readonly xDataKey?: string
  /**
   * Stroke width in px.
   * @default 2.5
   */
  strokeWidth?: number
  /**
   * Color above zero.
   * @default "var(--color-emerald-500, oklch(69.6% 0.17 162.48))"
   */
  readonly positiveColor?: string
  /**
   * Color below zero.
   * @default "var(--color-red-500, oklch(63.7% 0.237 25.331))"
   */
  readonly negativeColor?: string
  /**
   * d3 curve factory used to draw the line.
   * @default `curveLinear`
   */
  readonly curve?: CurveFactory
  /** Accepted so bklit-ui code compiles. Not read: a profit/loss line never fades its ends. */
  readonly fadeEdges?: FadeEdges
}

/** One event marker for `ChartMarkers`: a circle with an icon at a date on the x-axis. */
export interface ChartMarker {
  /**
   * Date the marker is placed at on the x-axis. Markers that share a date are grouped into one cluster with a count badge.
   */
  readonly date: Date
  /** Icon or glyph shown inside the marker circle. Only text (a string or number) is drawn. */
  readonly icon: ChartContent
  /** Title shown in the tooltip. */
  readonly title: string
  /** Optional description shown under the title in the tooltip. */
  readonly description?: string
  /** Optional custom tooltip content. Replaces the title and description. */
  readonly content?: ChartContent
  /** Background color of the marker circle. */
  readonly color?: string
  /** Called when the marker is clicked. */
  readonly onClick?: () => void
  /** URL to navigate to when the marker is clicked. */
  readonly href?: string
  /** Where `href` opens: `"_blank"` for a new tab, `"_self"` for the same tab. */
  target?: '_blank' | '_self'
}

/** Props of `ChartMarkers`, a row of event markers along the top of the plot. */
export interface ChartMarkersProps {
  /** The markers to display. Markers on the same date are grouped. */
  readonly items: ReadonlyArray<Readonly<ChartMarker>>
  /**
   * Diameter of each marker circle in px.
   * @default 28
   */
  readonly size?: number
  /**
   * Draw a dashed vertical guide line from each marker down the plot.
   * @default true
   */
  readonly showLines?: boolean
  /** Accepted so bklit-ui code compiles. Not read: markers fade in with the chart entrance. */
  readonly animate?: boolean
  /** Cap on how many markers of a cluster fan out on hover. The count badge still shows the full cluster size. */
  readonly maxFanned?: number
}

/**
 * Props of `SeriesMarkers`: point markers for the series with this `dataKey` (same as `showMarkers` plus `markers` on its `Line` or `Area`).
 */
export interface SeriesMarkersProps extends SeriesPointMarkerStyle {
  /** Key of the series (a `Line` or `Area` `dataKey`) to draw markers on. */
  readonly dataKey: string
  /**
   * Fade the markers in with the chart entrance.
   * @default true
   */
  readonly animate?: boolean
}

/**
 * Props of `MarkerGroup`. As a chart child it draws one `ChartMarkers` group at the dates of its `markers`; the pixel-placement and portal props exist so bklit-ui code compiles and are not read.
 */
export interface MarkerGroupProps {
  /** Accepted so bklit-ui code compiles. Not read: the group is placed at the date of its markers. */
  readonly x?: number
  /** Accepted so bklit-ui code compiles. Not read. */
  readonly y?: number
  /** Markers in this group. Markers on the same date form one cluster. */
  readonly markers: ReadonlyArray<Readonly<ChartMarker>>
  /** Accepted so bklit-ui code compiles. Not read. */
  readonly isActive?: boolean
  /**
   * Diameter of each marker circle in px.
   * @default 28
   */
  readonly size?: number
  /** Accepted so bklit-ui code compiles. Not read. */
  readonly onHover?: (markers: Array<ChartMarker> | null) => void
  /** Accepted so bklit-ui code compiles. Not read. */
  readonly containerRef?: unknown
  /** Horizontal offset from the chart container used to anchor the fan-out of a cluster. */
  readonly marginLeft?: number
  /** Vertical offset from the chart container used to anchor the fan-out of a cluster. */
  readonly marginTop?: number
  /** Accepted so bklit-ui code compiles. Not read. */
  readonly animationDelay?: number
  /** Accepted so bklit-ui code compiles. Not read: markers fade in with the chart entrance. */
  readonly animate?: boolean
  /** Accepted so bklit-ui code compiles. Not read: the guide line spans the plot. */
  readonly lineHeight?: number
  /**
   * Draw a dashed vertical guide line from each marker down the plot.
   * @default true
   */
  readonly showLine?: boolean
  /**
   * Keep clusters fanned out even when they are not hovered.
   * @default false
   */
  readonly forceOpen?: boolean
  /** Accepted so bklit-ui code compiles. Not read. */
  readonly iconFill?: boolean
  /** Stroke color of the marker circle. Defaults to the `--chart-marker-border` color. */
  readonly borderColor?: string
  /**
   * Stroke width of the marker circle in px.
   * @default 1.5
   */
  readonly borderWidth?: number
  /** Cap on how many markers of a cluster fan out on hover. The count badge still shows the full cluster size. */
  readonly maxFanned?: number
  /**
   * Fade the markers to 40% opacity at rest, to spotlight another group.
   * @default false
   */
  readonly isMuted?: boolean
}
