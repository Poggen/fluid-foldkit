import { calendarViewInputs } from '@foldkit-visuals/fluid/calendar'
import { createKeyedLazy } from 'foldkit/html'
import type { Configuration } from '../../playground/configs/calendar'
import type { ResolvedSettings } from '../../settings'
import { target } from '../../motion'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Calendar, CalendarTooltips } from './dates-bindings'
import { demoPresentation } from './render-presentation'

type Child = FluidGalleryModel['calendar']
type Tooltips = FluidGalleryModel['calendarTooltips']
const render = (
  child: Child,
  tooltips: Tooltips,
  configuration: Configuration,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const triggers = new Map<
    string,
    Parameters<NonNullable<Parameters<typeof calendarViewInputs>[1]['registerTrigger']>>[1]
  >()
  return h.block(
    CalendarTooltips.embedView({
      slotId: 'date-tooltips',
      model: tooltips,
      viewInputs: {
        renderTrigger: (key, attributes) => {
          const trigger = triggers.get(key)
          if (trigger === undefined) throw new Error(`Missing calendar tooltip ${key}`)
          return trigger(attributes)
        },
        renderDocument: (content, popups) => h.div([h.Class('contents')], [content, ...popups]),
        render: ({ tooltip }) =>
          h.div(
            [h.Class('flex w-full justify-center px-4 py-10 sm:px-6')],
            [
              h.block(
                Calendar.embedView({
                  slotId: 'calendar',
                  model: child,
                  viewInputs: {
                    ...calendarViewInputs(h, {
                      key: 'gallery-calendar',
                      context: demoPresentation(shape, size, hover),
                      motion: target,
                      keyboardTrigger: false,
                      tooltip,
                      registerTrigger: (key, trigger) => triggers.set(key, trigger),
                      ...(configuration.cellSize === 'auto'
                        ? {}
                        : { cellSize: Number(configuration.cellSize) }),
                    }),
                  },
                }),
              ),
            ],
          ),
      },
    }),
  )
}
export const makeCalendarPlaygroundView = () => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    configuration: Configuration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    lazy('calendar-playground', render, [
      model.calendar,
      model.calendarTooltips,
      configuration,
      configuration.appearance.shape ?? settings.shape,
      configuration.appearance.size ?? settings.size,
      configuration.appearance.hover ?? settings.hover,
      h,
    ])
}
