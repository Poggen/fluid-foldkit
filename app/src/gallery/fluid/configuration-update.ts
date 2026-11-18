import { reconcileDataComponent } from './data-components-update'
import { reconcileBreadcrumb } from './breadcrumb-update'
import { resetConfiguration } from './configuration-reset'
import { admitConfiguredSidebar, ConfiguredSidebarBinding } from './configured-sidebar-binding'
import { Match, Option } from 'effect'
import { Update } from 'foldkit'
import { FluidGalleryBlock } from './block'
import { Accordion } from './core-bindings'
import { globalSettings } from './settings'
import { reconcileSimpleInput } from './simple-input-update'
import { reconcileSimpleState } from './simple-state-update'
import { reconcileSimpleContent } from './simple-content-update'
import { reconcileSimpleTooltip } from './simple-tooltip-update'
import { reconcileCard } from './card-playground-update'
import { reconcileBanner } from './banner-playground-update'
import { reconcileCombobox } from './combobox-playground-update'
import { reconcileCommandMenu } from './command-menu-playground-update'
import { reconcileInputMessage } from './input-message-playground-update'
import { reconcileDropdown } from './dropdown-playground-update'
import { reconcileCalendar } from './calendar-playground-update'
import { reconcileDatePicker } from './date-picker-playground-update'
import { reconcileAskUserQuestions } from './ask-user-questions-playground-update'

export const applyConfiguration = FluidGalleryBlock.makeStep(
  (
    model,
    {
      configuration,
      presentation,
      edited,
      intent,
    }: typeof FluidGalleryBlock.InMessage.InformedOfConfiguration.Type,
  ) => {
    if (configuration._tag === 'chart' || configuration._tag === 'none') return { model }
    const desired = { ...presentation, ...configuration.appearance }
    const effective =
      'size' in configuration &&
      (configuration.size === 'default' || configuration.size === 'compact')
        ? { ...desired, size: configuration.size }
        : desired
    const operation = Match.value(configuration).pipe(
      Match.tag('code-block', 'context-menu', 'data-table', reconcileDataComponent),
      Match.tag(
        'input',
        'textarea',
        'field',
        'input-group',
        'checkbox',
        'switch',
        'select',
        reconcileSimpleInput,
      ),
      Match.tag(
        'tabs',
        'slider',
        'checkbox-group',
        'radio-group',
        'thinking-steps',
        'carousel-dots',
        (c) => reconcileSimpleState(c, effective, edited),
      ),
      Match.tag(
        'badge',
        'chat-message',
        'dialog',
        'table',
        'thinking-indicator',
        'color-picker',
        reconcileSimpleContent,
      ),
      Match.tag('input-copy', 'tooltip', reconcileSimpleTooltip),
      Match.tag('button', () => FluidGalleryBlock.makeNoopStep()),
      Match.tag('accordion', (c) =>
        model.accordion.type === (c.expand === 'any' ? 'multiple' : 'single') &&
        model.accordion.collapsible === (c.expand !== 'one') &&
        model.accordion.highlight === (c.highlightExpanded ? 'item' : 'trigger')
          ? FluidGalleryBlock.makeNoopStep()
          : Accordion.informOfRoot({
              config: {
                type: c.expand === 'any' ? 'multiple' : 'single',
                collapsible: c.expand !== 'one',
                highlight: c.highlightExpanded ? 'item' : 'trigger',
                disabled: model.accordion.disabled,
                direction: model.accordion.direction,
                orientation: model.accordion.orientation,
                loopFocus: model.accordion.loopFocus,
                onValueChange: model.accordion.callback,
                ...(model.accordion.controlled ? { value: model.accordion.values } : {}),
              },
            }),
      ),
      Match.tag('breadcrumb', reconcileBreadcrumb),
      Match.tag('card', (c) => reconcileCard(c, effective)),
      Match.tag('banner', (c) => reconcileBanner(c, effective)),
      Match.tag('combobox', (c) => reconcileCombobox(c, effective)),
      Match.tag('command-menu', (c) => reconcileCommandMenu(c, effective)),
      Match.tag('input-message', (c) => reconcileInputMessage(c, effective, edited)),
      Match.tag('dropdown', (c) => reconcileDropdown(c, effective)),
      Match.tag('calendar', (c) => reconcileCalendar(c, effective, edited)),
      Match.tag('date-picker', (c) => reconcileDatePicker(c, effective)),
      Match.tag('ask-user-questions', (c) => reconcileAskUserQuestions(c, effective)),
      Match.tag('sidebar', (c) => {
        const first = Option.isNone(model.configuredSidebar)
        return Update.combineSteps([
          admitConfiguredSidebar,
          ConfiguredSidebarBinding.informOfConfiguration({
            configuration: c,
            presentation,
            ...(first ? { edited: ['*'] } : edited === undefined ? {} : { edited }),
            ...(intent === undefined ? {} : { intent }),
          }),
        ])
      }),
      Match.exhaustive,
    )
    return Update.combineSteps([
      FluidGalleryBlock.makeFieldsStep(() => ({ isPlayground: () => true })),
      ...(intent === 'reset' ? [resetConfiguration(configuration)] : []),
      globalSettings(effective, configuration._tag === 'color-picker'),
      operation,
    ])
  },
)
