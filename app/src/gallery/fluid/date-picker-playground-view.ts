import { calendarViewInputs } from '@foldkit-visuals/fluid/calendar'
import { createKeyedLazy } from 'foldkit/html'
import type { Configuration } from '../../playground/configs/date-picker'
import type { ResolvedSettings } from '../../settings'
import { target, highlight } from '../../motion'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Picker, CalendarTooltips } from './dates-bindings'
import { demoPresentation } from './render-presentation'

type Child = FluidGalleryModel['picker']
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
            [h.Class('flex w-full justify-start px-4 py-16 sm:px-6')],
            [
              h.block(
                Picker.embedView({
                  slotId: 'date-picker',
                  model: child,
                  viewInputs: {
                    ...calendarViewInputs(h, {
                      key: 'gallery-picker',
                      context: demoPresentation(shape, size, hover),
                      motion: target,
                      keyboardTrigger: false,
                      tooltip,
                      registerTrigger: (key, trigger) => triggers.set(key, trigger),
                    }),
                    highlight,
                  },
                }),
              ),
            ],
          ),
      },
    }),
  )
}
export const makeDatePickerPlaygroundView = () => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    configuration: Configuration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    lazy('date-picker-playground', render, [
      model.picker,
      model.calendarTooltips,
      configuration,
      configuration.appearance.shape ?? settings.shape,
      configuration.pickerSize === 'site'
        ? (configuration.appearance.size ?? settings.size)
        : configuration.pickerSize,
      configuration.appearance.hover ?? settings.hover,
      h,
    ])
}
