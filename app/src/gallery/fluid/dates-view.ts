import { fluidPages, type ComponentPage } from '../../../../lib/catalogue'
import { previewCard, previewAdmitted } from '../card'
import { calendarViewInputs } from '@foldkit-visuals/fluid/calendar'
import type {
  DocumentTooltipOccurrenceViewInputs,
  DocumentTooltipViewInputs,
} from '@foldkit-visuals/fluid/tooltip'
import { createKeyedLazy, type Html } from 'foldkit/html'
import { highlight, target } from '../../motion'
import type { FluidGalleryInputs, FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Calendar, CalendarTooltips, Picker } from './dates-bindings'
import { demoPresentation } from './render-presentation'
type TooltipRender = Parameters<DocumentTooltipViewInputs['render']>[0]['tooltip']
type TriggerRegistry = Map<
  string,
  (attributes: Parameters<DocumentTooltipOccurrenceViewInputs['trigger']>[0]) => Html
>
const dateInputs = (
  key: string,
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],

  tooltip: TooltipRender,
  triggers: TriggerRegistry,
  h: FluidViewBuilder,
) =>
  calendarViewInputs(h, {
    key,
    context: demoPresentation(shape, size, hover),
    motion: target,
    keyboardTrigger: false,
    tooltip,
    cellSize: 30,
    registerTrigger: (key, render) => {
      triggers.set(key, render)
    },
  })
const renderCalendar = (
  model: FluidGalleryModel['calendar'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],

  tooltip: TooltipRender,
  triggers: TriggerRegistry,
  h: FluidViewBuilder,
) =>
  h.block(
    Calendar.embedView({
      slotId: 'calendar',
      model,
      viewInputs: dateInputs('gallery-calendar', shape, size, hover, tooltip, triggers, h),
    }),
  )
const renderPicker = (
  model: FluidGalleryModel['picker'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],

  tooltip: TooltipRender,
  triggers: TriggerRegistry,
  h: FluidViewBuilder,
) =>
  h.block(
    Picker.embedView({
      slotId: 'date-picker',
      model,
      viewInputs: {
        ...dateInputs('gallery-picker', shape, size, hover, tooltip, triggers, h),
        highlight,
      },
    }),
  )
type CardArguments<Model> = [
  model: Model,
  tooltips: FluidGalleryModel['calendarTooltips'],
  page: ComponentPage,
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  admitted: boolean,
  standalone: boolean,
  h: FluidViewBuilder,
]
const renderCard = <Model>(
  body: (
    model: Model,
    shape: FluidGalleryInputs['settings']['shape'],
    size: FluidGalleryInputs['settings']['size'],
    hover: FluidGalleryInputs['settings']['hover'],

    tooltip: TooltipRender,
    triggers: TriggerRegistry,
    h: FluidViewBuilder,
  ) => Html,
  ...[model, tooltips, page, shape, size, hover, admitted, standalone, h]: CardArguments<Model>
) => {
  const settings = { shape, size, hover }
  const card = (content: Html) => previewCard(page, settings, content, h, !admitted, standalone)
  const triggers: TriggerRegistry = new Map()
  return h.block(
    CalendarTooltips.embedView({
      slotId: `${page.slug}-tooltips`,
      model: tooltips,
      viewInputs: {
        renderTrigger: (key, attributes) => {
          const render = triggers.get(key)
          if (render === undefined) throw new Error(`Missing calendar tooltip ${key}`)
          return render(attributes)
        },
        renderDocument: (content, popups) => h.div([h.Class('contents')], [content, ...popups]),
        render: ({ tooltip }) =>
          !admitted ? card(h.empty) : card(body(model, shape, size, hover, tooltip, triggers, h)),
      },
    }),
  )
}
const calendarCard = (...args: CardArguments<FluidGalleryModel['calendar']>) =>
  renderCard(renderCalendar, ...args)
const pickerCard = (...args: CardArguments<FluidGalleryModel['picker']>) =>
  renderCard(renderPicker, ...args)
export const makeDateDemos = () => {
  const lazy = createKeyedLazy()
  return (model: FluidGalleryModel, inputs: FluidGalleryInputs, h: FluidViewBuilder) => {
    const cards: Record<string, () => Html> = {}
    for (const page of fluidPages) {
      if (page.slug !== 'calendar' && page.slug !== 'date-picker') continue
      const args = [
        model.calendarTooltips,
        page,
        inputs.settings.shape,
        inputs.settings.size,
        inputs.settings.hover,
        previewAdmitted(page, inputs),
        inputs.only !== undefined,
        h,
      ] satisfies Parameters<typeof calendarCard> extends [unknown, ...infer Rest] ? Rest : never
      if (page.slug === 'calendar')
        cards[page.slug] = () => lazy(page.slug, calendarCard, [model.calendar, ...args])
      else if (page.slug === 'date-picker')
        cards[page.slug] = () => lazy(page.slug, pickerCard, [model.picker, ...args])
    }
    return cards
  }
}
