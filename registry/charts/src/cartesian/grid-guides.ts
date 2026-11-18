import { ruleX, ruleY } from '@tanstack/charts/rule'
import { decorative } from '@tanstack/charts/mark/decorative'
import { createMark } from '@tanstack/charts'
import type { ChartMark, ChartValue } from '@tanstack/charts'
import { sourceGridClass } from './grid-mask'

const withoutEdges: <T>(ticks: Array<T>, hide: boolean) => Array<T> = function withoutEdges<T>(
  ticks: Array<T>,
  hide: boolean,
) {
  return (hide && ticks.length > 2 ? ticks.slice(1, -1) : ticks) satisfies Array<T>
}

const sourceGridMark: <Datum, X extends ChartValue, Y extends ChartValue>(
  mark: ChartMark<Datum, X, Y>,
  presentation: { readonly id: string } | undefined,
  direction: 'rows' | 'columns',
) => ChartMark<Datum, X, Y> = function sourceGridMark<
  Datum,
  X extends ChartValue,
  Y extends ChartValue,
>(
  mark: ChartMark<Datum, X, Y>,
  presentation: { readonly id: string } | undefined,
  direction: 'rows' | 'columns',
) {
  if (presentation === undefined) {
    return mark satisfies ChartMark<Datum, X, Y>
  }

  return createMark((context) => {
    const initialized = mark.initialize(context)

    return {
      ...initialized,
      render: (renderContext) => {
        const scene = initialized.render(renderContext)

        return {
          ...scene,
          nodes: scene.nodes.map((node) =>
            node.kind === 'group' && node.key === initialized.id
              ? {
                  ...node,
                  className: `${node.className ?? ''} bkm-source-grid ${sourceGridClass(presentation.id, direction)}`,
                }
              : node,
          ),
        }
      },
    }
  }, false) satisfies ChartMark<Datum, X, Y>
}

/** The grid of a chart with `status="loading"`: `loadingStroke` (falls back to `stroke`), or with `shimmer` the dimmed band stroke. */
export const loadingGridProps: (grid: GridGuideProps | undefined) => GridGuideProps | undefined =
  function loadingGridProps(grid: GridGuideProps | undefined) {
    if (!grid) {
      return grid
    }

    if (grid.shimmer === true) {
      return {
        ...grid,
        stroke: grid.shimmerStroke ?? DEFAULT_SHIMMER_STROKE,
        strokeOpacity: SHIMMER_BASE_OPACITY,
      }
    }

    return grid.loadingStroke === undefined ? grid : { ...grid, stroke: grid.loadingStroke }
  }

/** The grid line presentation over bklit's defaults (var(--chart-grid), opacity 1, width 1, dash "4,4"). */
export const gridLineStyle: (grid: GridGuideProps) => GridLineStyle = function gridLineStyle(
  grid: GridGuideProps,
) {
  return {
    stroke: grid.stroke ?? DEFAULT_GRID_STROKE,
    strokeOpacity: grid.strokeOpacity ?? 1,
    strokeWidth: grid.strokeWidth ?? 1,
    strokeDasharray: (grid.strokeDasharray ?? '4,4').replace(',', ' '),
  }
}

/** Host attributes for the static edge-fade rules: bklit fades rows by default and columns only on request. */
export const gridHostAttrs: (grid: GridGuideProps | undefined) => GridHostAttrs =
  function gridHostAttrs(grid: GridGuideProps | undefined) {
    return {
      'data-bkm-grid-nofade-h': grid?.fadeHorizontal === false ? '' : undefined,
      'data-bkm-grid-fade-v': grid?.fadeVertical === true ? '' : undefined,
    }
  }

/** Horizontal grid for one value scale. `axisTicks` is the `YAxis` `numTicks` of an axis that draws labels (undefined: no axis);
 * `scale.ticks` gives bklit's tick set. */
export const gridRowGuides: (
  grid: GridGuideProps | undefined,
  scale: { ticks: (count: number) => Array<number> },
  axisLabels: boolean,
  axisTicks: number | undefined,
  presentation?: { readonly id: string },
) => GridRowGuides = function gridRowGuides(
  grid: GridGuideProps | undefined,
  scale: { ticks: (count: number) => Array<number> },
  axisLabels: boolean,
  axisTicks: number | undefined,
  presentation?: { readonly id: string },
) {
  const rows = grid?.numTicksRows ?? DEFAULT_ROW_TICKS
  const count = axisLabels ? (axisTicks ?? DEFAULT_ROW_TICKS) : rows

  if (!grid || grid.horizontal === false) {
    return { native: false, count, marks: [] }
  }

  const marks: Array<GridRowMark> = []

  const native =
    presentation === undefined &&
    !grid.rowTickValues &&
    !grid.hideHorizontalEdgeLines &&
    rows === count

  if (!native) {
    const rowValues = withoutEdges(
      grid.rowTickValues ?? scale.ticks(rows),
      grid.hideHorizontalEdgeLines === true,
    )

    const rowStyle = gridLineStyle(grid)
    marks.push(
      decorative(
        sourceGridMark(
          ruleY(rowValues, {
            id: presentation === undefined ? 'grid-rows' : 'source-grid-rows',
            motion: false,
            ...rowStyle,
            y: (value: number) => value,
          }),
          presentation,
          'rows',
        ),
      ),
    )
  }

  marks.push(...gridHighlightRows(grid))

  return { native, count, marks }
}

const gridHighlightRows: (grid: GridGuideProps | undefined) => Array<GridRowMark> =
  function gridHighlightRows(grid: GridGuideProps | undefined) {
    const values = grid?.highlightRowValues

    if (!grid || grid.horizontal === false || !values || values.length === 0) {
      return []
    }

    return [
      decorative(
        ruleY(values, {
          id: 'grid-highlight-rows',
          motion: false,
          stroke: grid.highlightRowStroke ?? 'var(--chart-foreground-muted)',
          strokeDasharray: (grid.highlightRowStrokeDasharray ?? '0').replace(',', ' '),
          strokeOpacity: grid.highlightRowStrokeOpacity ?? 1,
          strokeWidth: grid.highlightRowStrokeWidth ?? 1,
          y: (value: number) => value,
        }),
      ),
    ]
  }

/** Vertical grid as marks: bklit's columns are `columnScale.ticks(numTicksColumns)` of its local-time scale (default 10), minus first and last
 * when `hideVerticalEdgeLines`, independent of the x axis labels. Pass a local-time `scaleTime` over the plot's x domain. */
export const gridColumnGuides: (
  grid: GridGuideProps | undefined,
  scale: { ticks: (count: number) => Array<Date> },
  presentation?: { readonly id: string },
) => Array<GridMark> = function gridColumnGuides(
  grid: GridGuideProps | undefined,
  scale: { ticks: (count: number) => Array<Date> },
  presentation?: { readonly id: string },
) {
  if (grid?.vertical !== true) {
    return []
  }

  return [
    decorative(
      sourceGridMark(
        ruleX(
          withoutEdges(
            scale.ticks(grid.numTicksColumns ?? DEFAULT_COLUMN_TICKS),
            grid.hideVerticalEdgeLines === true,
          ),
          {
            id: presentation === undefined ? 'grid-columns' : 'source-grid-columns',
            motion: false,
            ...gridLineStyle(grid),
            x: (value: Date) => value,
          },
        ),
        presentation,
        'columns',
      ),
    ),
  ]
}

export type GridRowMark = ChartMark<never, never, number, never, number>

export type GridMark = GridRowMark | ChartMark<never, Date, never, Date, never>

const DEFAULT_GRID_STROKE = 'var(--chart-grid)'

export interface GridGuideProps {
  horizontal?: boolean
  vertical?: boolean
  numTicksRows?: number
  numTicksColumns?: number
  rowTickValues?: Array<number>
  stroke?: string
  strokeOpacity?: number
  strokeWidth?: number
  strokeDasharray?: string
  highlightRowValues?: Array<number>
  highlightRowStroke?: string
  highlightRowStrokeOpacity?: number
  highlightRowStrokeWidth?: number
  highlightRowStrokeDasharray?: string
  fadeHorizontal?: boolean
  fadeVertical?: boolean
  hideHorizontalEdgeLines?: boolean
  hideVerticalEdgeLines?: boolean
  yAxisId?: string | number
  loadingStroke?: string
  shimmer?: boolean
  shimmerStroke?: string
}

const DEFAULT_SHIMMER_STROKE = 'color-mix(in oklch, var(--bkm-foreground) 68%, transparent)'

const SHIMMER_BASE_OPACITY = 0.22

const DEFAULT_ROW_TICKS = 5

const DEFAULT_COLUMN_TICKS = 10

interface GridLineStyle {
  stroke: string
  strokeOpacity: number
  strokeWidth: number
  strokeDasharray: string
}

type GridHostAttrs = {
  'data-bkm-grid-nofade-h': string | undefined
  'data-bkm-grid-fade-v': string | undefined
}

export interface GridRowGuides {
  /** Whether the value scale keeps its native `grid` (the grid ticks equal the axis ticks). */
  readonly native: boolean
  /** Tick count for the value scale's axis (bklit `YAxis` `numTicks`, default 5; the grid's count when there is no axis). */
  readonly count: number
  /** Row rules (when not native) and highlight rows, in bklit's draw order: under every series. */
  readonly marks: Array<GridRowMark>
}
