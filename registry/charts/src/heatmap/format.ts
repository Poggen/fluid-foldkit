const ORDINAL_TEEN_START = 11

const ORDINAL_TEEN_END = 13

const ORDINAL_SUFFIX_MOD = 10

const ORDINAL_RD_SUFFIX_DIGIT = 3

const formatHeatmapOrdinalDay: (day: number) => string = (day: number) => {
  if (day >= ORDINAL_TEEN_START && day <= ORDINAL_TEEN_END) {
    return `${day}th`
  }

  switch (day % ORDINAL_SUFFIX_MOD) {
    case 1: {
      return `${day}st`
    }

    case 2: {
      return `${day}nd`
    }

    case ORDINAL_RD_SUFFIX_DIGIT: {
      return `${day}rd`
    }

    default: {
      return `${day}th`
    }
  }
}

const heatmapTooltipMonthFmt = /* @__PURE__ */ new Intl.DateTimeFormat('en-US', { month: 'long' })

const heatmapTooltipWeekdayFmt = /* @__PURE__ */ new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
})

const heatmapMonthShortFmt = /* @__PURE__ */ new Intl.DateTimeFormat('en-US', { month: 'short' })

export const formatHeatmapMonthShort: (date: Readonly<Date>) => string = (date: Readonly<Date>) =>
  heatmapMonthShortFmt.format(date)

export const formatHeatmapTooltipDate: (date: Readonly<Date>) => string = (
  date: Readonly<Date>,
) => {
  const month = heatmapTooltipMonthFmt.format(date)
  const day = formatHeatmapOrdinalDay(date.getDate())

  return `${month} ${day} ${date.getFullYear()}`
}

export const formatHeatmapTooltipWeekday: (date: Readonly<Date>) => string = (
  date: Readonly<Date>,
) => heatmapTooltipWeekdayFmt.format(date)

export const formatHeatmapContributionLabel: (
  count: number,
  _secondaryDate?: Readonly<Date>,
) => string = (count: number, _secondaryDate?: Readonly<Date>) => {
  const word = count === 1 ? 'contribution' : 'contributions'

  return `${count} ${word}`
}
