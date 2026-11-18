/** Abbreviated weekday names, Sunday first. */
export const HEATMAP_DAY_LABELS: readonly ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
]

const WEEKDAY_SUNDAY = 0

const WEEKDAY_MONDAY = 1

const WEEKDAY_TUESDAY = 2

const WEEKDAY_WEDNESDAY = 3

const WEEKDAY_THURSDAY = 4

const WEEKDAY_FRIDAY = 5

const WEEKDAY_SATURDAY = 6

/** Weekday shown in the first row of the grid: `0` is Sunday, `1` Monday, up to `6` Saturday. */
export type HeatmapWeekStartDay =
  | typeof WEEKDAY_SUNDAY
  | typeof WEEKDAY_MONDAY
  | typeof WEEKDAY_TUESDAY
  | typeof WEEKDAY_WEDNESDAY
  | typeof WEEKDAY_THURSDAY
  | typeof WEEKDAY_FRIDAY
  | typeof WEEKDAY_SATURDAY

export const getHeatmapDayLabels: (weekStartDay?: HeatmapWeekStartDay) => ReadonlyArray<string> = (
  weekStartDay: HeatmapWeekStartDay = 0,
) => {
  if (weekStartDay === 0) {
    return HEATMAP_DAY_LABELS satisfies ReadonlyArray<string>
  }

  return [
    ...HEATMAP_DAY_LABELS.slice(weekStartDay),
    ...HEATMAP_DAY_LABELS.slice(0, weekStartDay),
  ] satisfies ReadonlyArray<string>
}

/** Weekday label format: `"full"` shows the abbreviation (Mon), `"initial"` its first letter (M). */
export type HeatmapYAxisLabelFormat = 'full' | 'initial'

export const formatHeatmapYAxisLabel: (
  label: string,
  labelFormat: HeatmapYAxisLabelFormat,
) => string = (label: string, labelFormat: HeatmapYAxisLabelFormat) =>
  labelFormat === 'initial' ? label.charAt(0) : label

/** Which rows get a weekday label: `"all"`, `"odd"` rows or `"even"` rows. */
export type HeatmapYAxisTickFilter = 'all' | 'odd' | 'even'

export const shouldShowHeatmapYAxisTick: (
  row: number,
  tickFilter: HeatmapYAxisTickFilter,
) => boolean = (row: number, tickFilter: HeatmapYAxisTickFilter) => {
  switch (tickFilter) {
    case 'all': {
      return true
    }

    case 'odd': {
      return row % 2 === 1
    }

    case 'even': {
      return row % 2 === 0
    }

    default: {
      return row % 2 === 1
    }
  }
}
