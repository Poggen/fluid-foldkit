interface HeatmapHoverStyleParams {
  readonly inactiveOpacity: number
  readonly inactiveScale: number
  readonly activeScale: number
}

/** Whether hover styling runs (disabled when all scale/opacity props are 1). */
export const isHeatmapHoverEffectEnabled: (params: Readonly<HeatmapHoverStyleParams>) => boolean = (
  params: Readonly<HeatmapHoverStyleParams>,
) => params.inactiveOpacity !== 1 || params.inactiveScale !== 1 || params.activeScale !== 1

interface HeatmapHoverStyle {
  readonly opacity: number
  readonly scale: number
}

/** Opacity and scale for highlighted vs dimmed cells and legend swatches. */
export const resolveHeatmapHoverStyle: (
  isHighlighted: boolean,
  isDimmed: boolean,
  params: Readonly<HeatmapHoverStyleParams>,
) => HeatmapHoverStyle = (
  isHighlighted: boolean,
  isDimmed: boolean,
  params: Readonly<HeatmapHoverStyleParams>,
) => {
  if (isHighlighted && params.activeScale !== 1) {
    return { opacity: 1, scale: params.activeScale }
  }

  if (isDimmed) {
    return { opacity: params.inactiveOpacity, scale: params.inactiveScale }
  }

  return { opacity: 1, scale: 1 }
}

const isReadonlyNumberArray = <Other>(
  value: Other,
): value is Extract<Other, ReadonlyArray<number>> => Array.isArray(value)

/** Per-row opacity multiplier for display rows (default 1); a single opacity or a per-row array. */
export const resolveHeatmapRowOpacity: (
  row: number,
  rowOpacity?: number | ReadonlyArray<number>,
) => number = (row: number, rowOpacity: number | ReadonlyArray<number> = 1) => {
  if (isReadonlyNumberArray(rowOpacity)) {
    return (rowOpacity[row] ?? 1) satisfies number
  }

  return rowOpacity satisfies number
}

const DEFAULT_FADED_OPACITY = 0.35

const DEFAULT_ACTIVE_OPACITY = 1

const DEFAULT_ROW_COUNT = 7

export const buildHeatmapRowOpacity: (
  match: ReadonlyArray<number> | ((row: number) => boolean),
  fadedOpacity?: number,
  activeOpacity?: number,
  rowCount?: number,
) => Array<number> = (
  match: ReadonlyArray<number> | ((row: number) => boolean),
  fadedOpacity: number = DEFAULT_FADED_OPACITY,
  activeOpacity: number = DEFAULT_ACTIVE_OPACITY,
  rowCount: number = DEFAULT_ROW_COUNT,
) => {
  if (isReadonlyNumberArray(match)) {
    const opacity = Array.from({ length: rowCount }, () => activeOpacity)

    for (const row of match) {
      if (row >= 0 && row < rowCount) {
        opacity[row] = fadedOpacity
      }
    }

    return opacity satisfies Array<number>
  }

  return Array.from({ length: rowCount }, (_unused, row) =>
    match(row) ? fadedOpacity : activeOpacity,
  ) satisfies Array<number>
}
