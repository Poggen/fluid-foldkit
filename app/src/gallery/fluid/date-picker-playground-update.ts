import { Update } from 'foldkit'
import type { ComponentPresentation } from '../../settings'
import { datePresets, type Configuration } from '../../playground/configs/date-picker'
import { calendarRuleRevision } from '../../playground/configs/calendar'
import { FluidGalleryBlock } from './block'
import { Picker } from './dates-bindings'

export const reconcileDatePicker = (
  configuration: Configuration,
  presentation: ComponentPresentation,
) =>
  FluidGalleryBlock.makeStep((model) => {
    const hover = configuration.appearance.hover ?? presentation.hover
    const state = model.picker.picker
    const current = model.picker.presentation
    const next = {
      ...current,
      cellSize: null,
      locale: null,
      variant: configuration.variant,
      orientation: configuration.calendarOrientation,
      numberOfMonths: configuration.numberOfMonths,
      showWeekNumber: configuration.showWeekNumber,
      disabled: configuration.disabled,
      clearable: configuration.clearable,
      placeholder: configuration.placeholder,
      compact:
        (configuration.pickerSize === 'site'
          ? (configuration.appearance.size ?? presentation.size)
          : configuration.pickerSize) === 'compact',
      hoverMode: hover,
      step: configuration.step,
      hourCycle:
        configuration.clock === 'locale'
          ? null
          : configuration.clock === '12'
            ? (12 as const)
            : (24 as const),
      presets:
        configuration.type === 'range' && configuration.presets
          ? datePresets(model.picker.renderNow)
          : [],
    }
    const timeChanged =
      state.mode !== configuration.type ||
      state.hasTime !== (configuration.type === 'single' && configuration.time === 'time') ||
      state.hasTimeRange !==
        (configuration.type === 'single' && configuration.time === 'timeRange') ||
      !state.controlledValue
    return Update.combineSteps([
      ...(timeChanged
        ? [
            Picker.requestAction({
              action: {
                _tag: 'Accepted',
                ...state,
                mode: configuration.type,
                value: model.pickerSelections[configuration.type],
                controlledValue: true,
                hasTime: configuration.type === 'single' && configuration.time === 'time',
                hasTimeRange: configuration.type === 'single' && configuration.time === 'timeRange',
                time: model.pickerTime,
                timeRange: model.pickerTimeRange,
                controlledTime: true,
                controlledTimeRange: true,
              },
            }),
          ]
        : []),
      ...(JSON.stringify(current) !== JSON.stringify(next) ||
      model.picker.calendar.calendar.revision !== calendarRuleRevision(configuration.days)
        ? [
            Picker.requestConfigure({
              presentation: next,
              calendarRevision: calendarRuleRevision(configuration.days),
            }),
          ]
        : []),
    ])
  })
