import { Update } from 'foldkit'
import type { ComponentPresentation } from '../../settings'
import { calendarRuleRevision, type Configuration } from '../../playground/configs/calendar'
import { FluidGalleryBlock } from './block'
import { Calendar } from './dates-bindings'

export const reconcileCalendar = (
  configuration: Configuration,
  presentation: ComponentPresentation,
  edited: ReadonlyArray<string> = ['*'],
) =>
  FluidGalleryBlock.makeStep((model) => {
    const hover = configuration.appearance.hover ?? presentation.hover
    const changedKey = (...keys: ReadonlyArray<string>) =>
      edited.includes('*') || keys.some((key) => edited.includes(key))
    const state = model.calendar.calendar
    const revision = calendarRuleRevision(configuration.days)
    const calendarPresentation = {
      numberOfMonths: configuration.numberOfMonths,
      orientation: configuration.orientation,
      showWeekNumber: configuration.showWeekNumber,
      hoverMode: hover,
    }
    const changed = changedKey('type', 'numberOfMonths', 'orientation', 'showWeekNumber')
    return Update.combineSteps([
      ...(changed
        ? [
            Calendar.requestSynchronization({
              selection: {
                ...state.selection,
                controlled: true,
                mode: configuration.type,
                selected: model.calendarSelections[configuration.type],
              },
              month: state.month,
              controlledMonth: state.controlledMonth,
              presentation: calendarPresentation,
              occurrenceFocus: false,
            }),
          ]
        : []),
      ...(state.presentation.hoverMode === hover
        ? []
        : [Calendar.requestHoverMode({ mode: hover })]),
      ...(changedKey('days') ? [Calendar.requestRefresh({ revision })] : []),
    ])
  })
