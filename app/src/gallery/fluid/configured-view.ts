import { Match, Option } from 'effect'
import { createKeyedLazy } from 'foldkit/html'
import type { FluidConfiguration } from '../../playground/configuration'
import type { ResolvedSettings } from '../../settings'
import type { FluidGalleryModel } from './block'
import type { FluidGalleryBlock } from './block'
import type { FluidViewBuilder } from './composition'
import { makeSimpleInputView } from './simple-input-view'
import { makeSimpleStateView } from './simple-state-view'
import { makeSimpleContentView } from './simple-content-view'
import { makeSimpleTooltipView } from './simple-tooltip-view'
import { makeSimplePureView } from './simple-pure-view'
import { renderBreadcrumb } from './breadcrumb-view'
import { makeCardPlaygroundView } from './card-playground-view'
import { makeBannerPlaygroundView } from './banner-playground-view'
import { makeComboboxPlaygroundView } from './combobox-playground-view'
import { makeCommandMenuPlaygroundView } from './command-menu-playground-view'
import { makeInputMessagePlaygroundView } from './input-message-playground-view'
import { makeDropdownPlaygroundView } from './dropdown-playground-view'
import { makeCalendarPlaygroundView } from './calendar-playground-view'
import { makeDatePickerPlaygroundView } from './date-picker-playground-view'
import { makeAskUserQuestionsPlaygroundView } from './ask-user-questions-playground-view'
import { ConfiguredSidebarBinding } from './configured-sidebar-binding'

export type ConfiguredViewEvents = Pick<
  typeof FluidGalleryBlock.Message,
  | 'ChangedDropdownQuery'
  | 'DismissedBanner'
  | 'DismissedCard'
  | 'HoveredCarousel'
  | 'PickedCarousel'
  | 'Refreshed'
  | 'RequestedCopyBanner'
  | 'SelectedCard'
>

export const makeConfiguredView = (events: ConfiguredViewEvents) => {
  const lazy = createKeyedLazy()
  const input = makeSimpleInputView(),
    state = makeSimpleStateView(events),
    content = makeSimpleContentView(events),
    tooltips = makeSimpleTooltipView(),
    pure = makeSimplePureView()
  const card = makeCardPlaygroundView(events)
  const banner = makeBannerPlaygroundView(events)
  const combobox = makeComboboxPlaygroundView()
  const command_menu = makeCommandMenuPlaygroundView()
  const input_message = makeInputMessagePlaygroundView()
  const dropdown = makeDropdownPlaygroundView(events)
  const calendar = makeCalendarPlaygroundView()
  const date_picker = makeDatePickerPlaygroundView()
  const ask_user_questions = makeAskUserQuestionsPlaygroundView()
  return (
    model: FluidGalleryModel,
    configuration: FluidConfiguration,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    Match.value(configuration).pipe(
      Match.tag('input', 'textarea', 'field', 'input-group', 'checkbox', 'switch', 'select', (c) =>
        input(model, c, settings, h),
      ),
      Match.tag(
        'tabs',
        'slider',
        'checkbox-group',
        'radio-group',
        'thinking-steps',
        'carousel-dots',
        (c) => state(model, c, settings, h),
      ),
      Match.tag(
        'badge',
        'chat-message',
        'dialog',
        'table',
        'thinking-indicator',
        'color-picker',
        (c) => content(model, c, settings, h),
      ),
      Match.tag('input-copy', 'tooltip', (c) => tooltips(model, c, settings, h)),
      Match.tag('button', 'accordion', (c) => pure(model, c, settings, h)),
      Match.tag('breadcrumb', (c) =>
        lazy('breadcrumb', renderBreadcrumb, [
          model.breadcrumb,
          model.crumbHidden,
          model.crumbMenu,
          model.crumbSection,
          c,
          c.appearance.shape ?? settings.shape,
          c.appearance.size ?? settings.size,
          c.appearance.hover ?? settings.hover,
          h,
          events.Refreshed,
        ]),
      ),
      Match.tag('card', (c) => card(model, c, settings, h)),
      Match.tag('banner', (c) => banner(model, c, settings, h)),
      Match.tag('combobox', (c) => combobox(model, c, settings, h)),
      Match.tag('command-menu', (c) => command_menu(model, c, settings, h)),
      Match.tag('input-message', (c) => input_message(model, c, settings, h)),
      Match.tag('dropdown', (c) => dropdown(model, c, settings, h)),
      Match.tag('calendar', (c) => calendar(model, c, settings, h)),
      Match.tag('date-picker', (c) => date_picker(model, c, settings, h)),
      Match.tag('ask-user-questions', (c) => ask_user_questions(model, c, settings, h)),
      Match.tag('sidebar', (c) =>
        Option.isSome(model.configuredSidebar)
          ? h.block(
              ConfiguredSidebarBinding.embedView({
                slotId: 'sidebar-playground',
                model: model.configuredSidebar.value,
                viewInputs: { configuration: c, presentation: settings },
              }),
            )
          : h.empty,
      ),
      Match.exhaustive,
    )
}
