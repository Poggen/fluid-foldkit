// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
import type { ArcDatum } from './arcs'
import type { SunburstLabelsProps } from './carriers'
import { sunburstCssVars } from './colors'
import type { SunburstNativeNode } from './sunburst-mark'

const DEFAULT_LABEL_FONT_SIZE = 11

const LABEL_FONT_WEIGHT = 600

const DEFAULT_LABEL_HALO = 2.5

interface LabelsOption {
  readonly fill: string
  readonly fontSize: number
  readonly fontWeight: number
  readonly stroke: string
  readonly strokeWidth: number
  readonly nameOf: (node: SunburstNativeNode) => string
  readonly classOf: (node: SunburstNativeNode) => string
}

/** The mark's label decoration for the `SunburstLabels` carrier, or undefined when the chart has none. */
export const labelsOption = (
  labels: SunburstLabelsProps | null,
  arcById: ReadonlyMap<string, ArcDatum>,
): LabelsOption | undefined =>
  labels === null
    ? undefined
    : {
        fill: labels.fill ?? sunburstCssVars.label,
        fontSize: labels.fontSize ?? DEFAULT_LABEL_FONT_SIZE,
        fontWeight: LABEL_FONT_WEIGHT,
        stroke: labels.stroke ?? sunburstCssVars.background,
        strokeWidth: labels.strokeWidth ?? DEFAULT_LABEL_HALO,
        nameOf: (node: SunburstNativeNode): string => arcById.get(node.id)?.name ?? node.name,
        classOf: (node: SunburstNativeNode): string =>
          `bk-sb-l-${arcById.get(node.id)?.arcIndex ?? -1}`,
      }
