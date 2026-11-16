// Gauge notches remain keyed areaX paths across straight, tapered, and rounded geometry changes.
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { defineChart } from '@tanstack/charts/scene'
import { areaX } from '@tanstack/charts/area-x'
import type { DomChartDefinition } from '@tanstack/charts'
import { motion } from '@tanstack/charts/motion'
import {
  arcPolygonVertices,
  linearNotches,
  rectLinearVertices,
  taperedLinearVertices,
} from './notches'
import type { FillOptions, GaugeNotchRow } from './notches'
import { notchPolygonCurve } from './notch-path'

// The server reserve uses this renderer; the live host supplies the per-notch Motion owner.
export const gaugeMotion = motion({ initial: false, respectReducedMotion: true })

export const ARC_ASPECT = 21 / 16

// Linear notches are laid out in normalized x units so no pixel measurement is needed.
const LINEAR_UNITS = 1000

const UNIT = 1000

// bklit's tapered linear notch: the inner (bottom) edge is 28/42 of the outer.
const TAPER_RATIO = 28 / 42

// Original GaugeNotchSvg animates only entrance opacity/scale. Geometry and fill
// are plain props, and removed active notches disappear immediately. The live owner
// handles entrance; the renderer commits geometry without an additional morph spring.
// Every notch's fill goes through the chart's native colour scale (key -> fill), so the track and the active notches are one mark each.
const bgKey = (row: GaugeNotchRow): string => `b${row.index}`

const activeKey = (row: GaugeNotchRow): string => `a${row.index}`

interface ColorScaleSpec {
  readonly domain: ReadonlyArray<string>
  readonly range: ReadonlyArray<string>
}

const vertexFillScale = (rows: ReadonlyArray<GaugeNotchRow>): ColorScaleSpec => {
  const notches = rows.filter((row, index) => index === 0 || rows[index - 1]?.index !== row.index)

  return {
    domain: notches.flatMap((row) => [bgKey(row), activeKey(row)]),
    range: notches.flatMap((row) => [row.trackFill, row.activeFill]),
  }
}

export interface GaugeDefinitionInput {
  readonly linear: boolean
  /** Pixel size of a fixed-size arc; absent when the arc fills its container. */
  readonly fixedArc: { readonly width: number; readonly height: number } | undefined
  readonly uniformWidth: boolean | undefined
  readonly trackHeight: number
  readonly value: number
  readonly spacing: number
  readonly startAngle: number
  readonly endAngle: number
  readonly notchCornerRadius: number
  readonly notchLengthPercent: number
  readonly notchWidthPercent: number
  readonly inactiveFillOpacity: number
  readonly activeFillOpacity: number
  readonly animate: boolean
  readonly fill: Omit<FillOptions, 'linear'>
}

const axes = (
  unitsW: number,
  unitsH: number,
): Record<'x' | 'y', { axis: false; scale: ReturnType<typeof scaleLinear> }> => ({
  x: { axis: false, scale: scaleLinear().domain([0, unitsW]) },
  y: { axis: false, scale: scaleLinear().domain([unitsH, 0]) },
})

const linearRows = (i: GaugeDefinitionInput): Array<GaugeNotchRow> =>
  linearNotches({
    ...i.fill,
    height: i.trackHeight,
    linear: true,
    notchLengthPercent: i.notchLengthPercent,
    notchWidthPercent: i.notchWidthPercent,
    spacing: i.spacing,
    value: i.value,
    width: LINEAR_UNITS,
  })

const polygonRows = (
  i: GaugeDefinitionInput,
  unitsW: number,
  unitsH: number,
): Array<GaugeNotchRow> => {
  if (i.linear) {
    const rows = linearRows(i)

    return i.uniformWidth === false
      ? taperedLinearVertices(rows, TAPER_RATIO)
      : rectLinearVertices(rows)
  }

  return arcPolygonVertices({
    ...i.fill,
    endAngle: i.endAngle,
    height: unitsH,
    linear: false,
    notchLengthPercent: i.notchLengthPercent,
    spacing: i.spacing,
    startAngle: i.startAngle,
    uniform: i.uniformWidth === true,
    value: i.value,
    width: unitsW,
  })
}

// One areaX per notch group (z), one row per vertex with x1 = x2, so the curve receives the four pixel vertices and writes the
// (optionally corner-cut) path. Arc uses uniform units with the canvas aspect.
const polygonDefinition = (
  i: GaugeDefinitionInput,
): DomChartDefinition<GaugeNotchRow, number, number> => {
  const unitsW = i.linear ? LINEAR_UNITS : (i.fixedArc?.width ?? UNIT * ARC_ASPECT)
  const unitsH = i.linear ? i.trackHeight : (i.fixedArc?.height ?? UNIT)
  const rows = polygonRows(i, unitsW, unitsH)

  const common = {
    curve: notchPolygonCurve(i.notchCornerRadius, !i.linear),
    key: (r: GaugeNotchRow, m: { readonly index: number }) => `${r.index}:${m.index}`,
    x1: (r: GaugeNotchRow) => r.x1,
    x2: (r: GaugeNotchRow) => r.x1,
    y: (r: GaugeNotchRow) => r.y1,
    z: (r: GaugeNotchRow) => r.index,
  }

  return defineChart({
    color: vertexFillScale(rows),
    focusRing: false,
    keyboard: false,
    margin: 0,
    pointer: false,
    marks: [
      areaX(rows, {
        ...common,
        color: bgKey,
        fillOpacity: i.inactiveFillOpacity,
        id: 'gauge:bg',
        motion: false,
      }),
      areaX(
        rows.filter((r) => r.active),
        {
          ...common,
          color: activeKey,
          fillOpacity: i.activeFillOpacity,
          id: 'gauge:active',
          motion: false,
        },
      ),
    ],
    scales: axes(unitsW, unitsH),
    tooltip: false,
  })
}

export const buildGaugeDefinition = (
  input: GaugeDefinitionInput,
): DomChartDefinition<GaugeNotchRow, number, number> => polygonDefinition(input)
