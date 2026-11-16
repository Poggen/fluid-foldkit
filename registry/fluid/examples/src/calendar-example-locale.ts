import type { makeCalendarEnvironment } from '@foldkit-visuals/fluid/calendar/environment'

type CalendarOptions = ReturnType<Parameters<typeof makeCalendarEnvironment>[0]>
type LocaleOptions = Pick<
  CalendarOptions,
  'lang' | 'locale' | 'weekStartsOn' | 'formatters' | 'labels'
>

export const calendarExampleLocale = (locale: 'en-US' | 'sv-SE'): LocaleOptions => {
  if (locale === 'en-US') return { lang: locale, locale: { code: locale } }

  const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: 'full' })
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' })
  const shortWeekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })

  return {
    lang: locale,
    locale: { code: locale },
    weekStartsOn: 1,
    formatters: {
      formatCaption: (date) => monthYear.format(date),
      formatWeekdayName: (date) => shortWeekday.format(date),
    },
    labels: {
      labelGrid: (date) => monthYear.format(date),
      labelDayButton: (date, modifiers) =>
        `${modifiers.today ? 'Idag, ' : ''}${fullDate.format(date)}${modifiers.selected ? ', vald' : ''}${modifiers.booked ? ', bokad' : ''}`,
      labelGridcell: (date, modifiers) =>
        `${modifiers?.today ? 'Idag, ' : ''}${fullDate.format(date)}`,
      labelWeekday: (date) => weekday.format(date),
      labelNext: () => 'Nästa månad',
      labelPrevious: () => 'Föregående månad',
      labelWeekNumber: (week) => `Vecka ${week}`,
      labelWeekNumberHeader: () => 'Veckonummer',
    },
  }
}
