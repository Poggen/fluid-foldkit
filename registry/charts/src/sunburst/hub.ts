/* @license Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT. */
import { radialArc } from '@tanstack/charts/polar'
import type { PolarMark } from '@tanstack/charts/polar'
import { sunburstCssVars } from './colors'
import type { SunburstNativeNode } from './sunburst-mark'

export const START_ANGLE = -Math.PI / 2

export const END_ANGLE = (3 * Math.PI) / 2

const HUB_GAP_PX = 2

const HUB_REST_RADIUS = 1e-6

export interface HubDatum {
  readonly kind: 'hub'
  readonly id: string
  readonly startAngle: number
  readonly endAngle: number
}

/** Datum of any point in the sunburst scene: the centre disc or a sector. */
export type SunburstDatum = HubDatum | SunburstNativeNode

export const isHub = (datum: unknown): datum is HubDatum =>
  typeof datum === 'object' && datum !== null && 'kind' in datum

export const hubMark: (
  hubRadius: (radius: number) => number,
  fill: string,
) => PolarMark<HubDatum, number, number, never, never> = (
  hubRadius: (radius: number) => number,
  fill: string,
) => {
  const hubData: Array<HubDatum> = [
    { endAngle: END_ANGLE, id: 'hub', kind: 'hub', startAngle: START_ANGLE },
  ]

  return radialArc(hubData, {
    endAngle: 'endAngle',
    className: 'bk-sunburst-hub',
    fill,
    id: 'sunburst-hub',
    innerRadius: 0,
    key: 'id',
    outerRadius: ({ radius }) => Math.max(hubRadius(radius) - HUB_GAP_PX, HUB_REST_RADIUS),
    startAngle: 'startAngle',

    stroke: sunburstCssVars.ring,
    strokeWidth: 1,
  })
}
