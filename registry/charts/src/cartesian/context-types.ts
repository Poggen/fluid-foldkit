/** A series registered with the Cartesian chart, distinct from its optional authoring options. */
export interface RegisteredLineConfig {
  readonly dataKey: string
  readonly stroke: string
  readonly strokeWidth: number
  readonly yAxisId?: string | number
}

export interface ReferenceAreaConfig {
  readonly yAxisId: string
  readonly y1: number | null
  readonly y2: number | null
  readonly axisLabelColor: string | null
}

export interface Margin {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}
