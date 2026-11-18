import { Match, Option, Schema } from 'effect'
import type { ComponentPage } from '../../../lib/catalogue'
import { PreviewOptions } from './legacy-options'
import type { Control } from './control-definition'
import * as Button from './configs/button'
import * as Badge from './configs/badge'
import * as Card from './configs/card'
import * as Accordion from './configs/accordion'
import * as Input from './configs/input'
import * as Textarea from './configs/textarea'
import * as Field from './configs/field'
import * as InputGroup from './configs/input-group'
import * as InputCopy from './configs/input-copy'
import * as Switch from './configs/switch'
import * as Checkbox from './configs/checkbox'
import * as Select from './configs/select'
import * as Combobox from './configs/combobox'
import * as CommandMenu from './configs/command-menu'
import * as Tabs from './configs/tabs'
import * as Slider from './configs/slider'
import * as CheckboxGroup from './configs/checkbox-group'
import * as RadioGroup from './configs/radio-group'
import * as Tooltip from './configs/tooltip'
import * as Dropdown from './configs/dropdown'
import * as Banner from './configs/banner'
import * as Breadcrumb from './configs/breadcrumb'
import * as ChatMessage from './configs/chat-message'
import * as ThinkingIndicator from './configs/thinking-indicator'
import * as ThinkingSteps from './configs/thinking-steps'
import * as InputMessage from './configs/input-message'
import * as AskUserQuestions from './configs/ask-user-questions'
import * as Sidebar from './configs/sidebar'
import * as Dialog from './configs/dialog'
import * as Table from './configs/table'
import * as CarouselDots from './configs/carousel-dots'
import * as Calendar from './configs/calendar'
import * as DatePicker from './configs/date-picker'
import * as ColorPicker from './configs/color-picker'

const None = Schema.TaggedStruct('none', {})
const Chart = Schema.TaggedStruct('chart', { slug: Schema.String, options: PreviewOptions })
export const PlaygroundConfiguration = Schema.Union([
  None,
  Chart,
  Button.Configuration,
  Badge.Configuration,
  Card.Configuration,
  Accordion.Configuration,
  Input.Configuration,
  Textarea.Configuration,
  Field.Configuration,
  InputGroup.Configuration,
  InputCopy.Configuration,
  Switch.Configuration,
  Checkbox.Configuration,
  Select.Configuration,
  Combobox.Configuration,
  CommandMenu.Configuration,
  Tabs.Configuration,
  Slider.Configuration,
  CheckboxGroup.Configuration,
  RadioGroup.Configuration,
  Tooltip.Configuration,
  Dropdown.Configuration,
  Banner.Configuration,
  Breadcrumb.Configuration,
  ChatMessage.Configuration,
  ThinkingIndicator.Configuration,
  ThinkingSteps.Configuration,
  InputMessage.Configuration,
  AskUserQuestions.Configuration,
  Sidebar.Configuration,
  Dialog.Configuration,
  Table.Configuration,
  CarouselDots.Configuration,
  Calendar.Configuration,
  DatePicker.Configuration,
  ColorPicker.Configuration,
])
export type PlaygroundConfiguration = typeof PlaygroundConfiguration.Type
const decodeCandidate = (input: unknown) =>
  Option.filter(
    Schema.decodeUnknownOption(PlaygroundConfiguration)(input),
    (configuration) => configuration._tag !== 'slider' || configuration.min < configuration.max,
  )

export const normalizeConfiguration: (
  configuration: PlaygroundConfiguration,
) => PlaygroundConfiguration = (configuration: PlaygroundConfiguration) =>
  configuration._tag === 'slider' ? Slider.normalize(configuration) : configuration

export const FluidConfiguration = Schema.Union([
  Button.Configuration,
  Badge.Configuration,
  Card.Configuration,
  Accordion.Configuration,
  Input.Configuration,
  Textarea.Configuration,
  Field.Configuration,
  InputGroup.Configuration,
  InputCopy.Configuration,
  Switch.Configuration,
  Checkbox.Configuration,
  Select.Configuration,
  Combobox.Configuration,
  CommandMenu.Configuration,
  Tabs.Configuration,
  Slider.Configuration,
  CheckboxGroup.Configuration,
  RadioGroup.Configuration,
  Tooltip.Configuration,
  Dropdown.Configuration,
  Banner.Configuration,
  Breadcrumb.Configuration,
  ChatMessage.Configuration,
  ThinkingIndicator.Configuration,
  ThinkingSteps.Configuration,
  InputMessage.Configuration,
  AskUserQuestions.Configuration,
  Sidebar.Configuration,
  Dialog.Configuration,
  Table.Configuration,
  CarouselDots.Configuration,
  Calendar.Configuration,
  DatePicker.Configuration,
  ColorPicker.Configuration,
])
export type FluidConfiguration = typeof FluidConfiguration.Type

export const controlsForConfiguration: (
  configuration: PlaygroundConfiguration,
) => ReadonlyArray<Control> = (configuration: PlaygroundConfiguration) => {
  return Match.value(configuration).pipe(
    Match.tagsExhaustive({
      button: (configuration) => Button.controlsFor(configuration),
      badge: (configuration) => Badge.controlsFor(configuration),
      card: (configuration) => Card.controlsFor(configuration),
      accordion: (configuration) => Accordion.controlsFor(configuration),
      input: (configuration) => Input.controlsFor(configuration),
      textarea: (configuration) => Textarea.controlsFor(configuration),
      field: (configuration) => Field.controlsFor(configuration),
      'input-group': (configuration) => InputGroup.controlsFor(configuration),
      'input-copy': (configuration) => InputCopy.controlsFor(configuration),
      switch: (configuration) => Switch.controlsFor(configuration),
      checkbox: (configuration) => Checkbox.controlsFor(configuration),
      select: (configuration) => Select.controlsFor(configuration),
      combobox: (configuration) => Combobox.controlsFor(configuration),
      'command-menu': (configuration) => CommandMenu.controlsFor(configuration),
      tabs: (configuration) => Tabs.controlsFor(configuration),
      slider: (configuration) => Slider.controlsFor(configuration),
      'checkbox-group': (configuration) => CheckboxGroup.controlsFor(configuration),
      'radio-group': (configuration) => RadioGroup.controlsFor(configuration),
      tooltip: (configuration) => Tooltip.controlsFor(configuration),
      dropdown: (configuration) => Dropdown.controlsFor(configuration),
      banner: (configuration) => Banner.controlsFor(configuration),
      breadcrumb: (configuration) => Breadcrumb.controlsFor(configuration),
      'chat-message': (configuration) => ChatMessage.controlsFor(configuration),
      'thinking-indicator': (configuration) => ThinkingIndicator.controlsFor(configuration),
      'thinking-steps': (configuration) => ThinkingSteps.controlsFor(configuration),
      'input-message': (configuration) => InputMessage.controlsFor(configuration),
      'ask-user-questions': (configuration) => AskUserQuestions.controlsFor(configuration),
      sidebar: (configuration) => Sidebar.controlsFor(configuration),
      dialog: (configuration) => Dialog.controlsFor(configuration),
      table: (configuration) => Table.controlsFor(configuration),
      'carousel-dots': (configuration) => CarouselDots.controlsFor(configuration),
      calendar: (configuration) => Calendar.controlsFor(configuration),
      'date-picker': (configuration) => DatePicker.controlsFor(configuration),
      'color-picker': (configuration) => ColorPicker.controlsFor(configuration),
      none: () => [],
      chart: () => [],
    }),
  )
}

export const defaultsForPage: (page: ComponentPage) => PlaygroundConfiguration = (
  page: ComponentPage,
) => {
  if (page.family === 'charts') return Chart.make({ _tag: 'chart', slug: page.slug, options: {} })
  return Match.value(page.slug)
    .pipe(
      Match.when('button', () => Button.defaults),
      Match.when('badge', () => Badge.defaults),
      Match.when('card', () => Card.defaults),
      Match.when('accordion', () => Accordion.defaults),
      Match.when('input', () => Input.defaults),
      Match.when('textarea', () => Textarea.defaults),
      Match.when('field', () => Field.defaults),
      Match.when('input-group', () => InputGroup.defaults),
      Match.when('input-copy', () => InputCopy.defaults),
      Match.when('switch', () => Switch.defaults),
      Match.when('checkbox', () => Checkbox.defaults),
      Match.when('select', () => Select.defaults),
      Match.when('combobox', () => Combobox.defaults),
      Match.when('command-menu', () => CommandMenu.defaults),
      Match.when('tabs', () => Tabs.defaults),
      Match.when('slider', () => Slider.defaults),
      Match.when('checkbox-group', () => CheckboxGroup.defaults),
    )
    .pipe(
      Match.when('radio-group', () => RadioGroup.defaults),
      Match.when('tooltip', () => Tooltip.defaults),
      Match.when('dropdown', () => Dropdown.defaults),
      Match.when('banner', () => Banner.defaults),
      Match.when('breadcrumb', () => Breadcrumb.defaults),
      Match.when('chat-message', () => ChatMessage.defaults),
      Match.when('thinking-indicator', () => ThinkingIndicator.defaults),
      Match.when('thinking-steps', () => ThinkingSteps.defaults),
      Match.when('input-message', () => InputMessage.defaults),
      Match.when('ask-user-questions', () => AskUserQuestions.defaults),
      Match.when('sidebar', () => Sidebar.defaults),
      Match.when('dialog', () => Dialog.defaults),
      Match.when('table', () => Table.defaults),
      Match.when('carousel-dots', () => CarouselDots.defaults),
      Match.when('calendar', () => Calendar.defaults),
      Match.when('date-picker', () => DatePicker.defaults),
      Match.when('color-picker', () => ColorPicker.defaults),
      Match.orElse(() => None.make({ _tag: 'none' })),
    )
}

const legacyAppearance = (options: PreviewOptions) => ({
  ...(options.shape === undefined ? {} : { shape: options.shape }),
  ...(options.size === 'default' || options.size === 'compact' ? { size: options.size } : {}),
  ...(options.hover === undefined ? {} : { hover: options.hover }),
})

export const configurationForPage: (
  page: ComponentPage,
  legacy?: PreviewOptions,
) => PlaygroundConfiguration = (page: ComponentPage, legacy: PreviewOptions = {}) => {
  const initial = defaultsForPage(page)
  if (initial._tag === 'chart')
    return { ...initial, options: legacy } satisfies PlaygroundConfiguration
  if (initial._tag === 'none') return initial satisfies PlaygroundConfiguration
  const candidate = {
    ...initial,
    ...legacy,
    ...(initial._tag === 'button' &&
    (legacy.buttonSize === 'icon' || legacy.buttonSize === 'icon-compact')
      ? { buttonSize: legacy.buttonSize === 'icon' ? 'default' : 'compact', iconOnly: true }
      : {}),
    ...(initial._tag === 'slider' && legacy.showValue !== undefined
      ? { valueDisplay: legacy.showValue ? 'show' : 'hide' }
      : {}),
    ...(initial._tag === 'dropdown' && legacy.menuPresentation !== undefined
      ? { mode: legacy.menuPresentation === 'popup' ? 'menu' : 'inline' }
      : {}),
    ...(initial._tag === 'banner' &&
    (legacy.variant === 'info' ||
      legacy.variant === 'success' ||
      legacy.variant === 'warning' ||
      legacy.variant === 'error')
      ? { variant: initial.variant, status: legacy.variant }
      : {}),
    ...(initial._tag === 'input-group' && typeof legacy.value === 'string'
      ? { firstValue: legacy.value, secondValue: legacy.value, thirdValue: legacy.value }
      : {}),
    _tag: initial._tag,
    appearance: legacyAppearance(legacy),
    ...(initial._tag === 'breadcrumb' && legacy.label !== undefined
      ? {
          items: initial.items.map((item, index) =>
            index === initial.items.length - 1 ? { ...item, label: legacy.label } : item,
          ),
        }
      : {}),
  }
  return normalizeConfiguration(
    Option.getOrElse(decodeCandidate(candidate), () => initial),
  ) satisfies PlaygroundConfiguration
}

export const updateConfiguration: (
  configuration: PlaygroundConfiguration,
  prop: string,
  value: string | number | boolean,
) => PlaygroundConfiguration = (
  configuration: PlaygroundConfiguration,
  prop: string,
  value: string | number | boolean,
) => {
  if (
    configuration._tag === 'date-picker' &&
    prop === 'type' &&
    (value === 'single' || value === 'range')
  )
    return { ...configuration, type: value, numberOfMonths: value === 'single' ? 1 : 2 }
  if (configuration._tag === 'breadcrumb' && prop.startsWith('item.'))
    return Breadcrumb.updateItem(configuration, prop, value)
  if (configuration._tag === 'chart') {
    const options = Schema.decodeUnknownOption(PreviewOptions)({
      ...configuration.options,
      [prop]: value,
    })
    return Option.isSome(options) ? { ...configuration, options: options.value } : configuration
  }
  if (
    !controlsForConfiguration(configuration).some(
      (control) => control.prop === prop && control.enabled !== false,
    )
  )
    return configuration
  if (
    configuration._tag === 'slider' &&
    ((prop === 'min' && typeof value === 'number' && value >= configuration.max) ||
      (prop === 'max' && typeof value === 'number' && value <= configuration.min))
  )
    return configuration
  return normalizeConfiguration(
    Option.getOrElse(decodeCandidate({ ...configuration, [prop]: value }), () => configuration),
  )
}

export const serializeConfiguration = (configuration: PlaygroundConfiguration) =>
  JSON.stringify(normalizeConfiguration(configuration))
export const decodeConfiguration: (serialized: string) => Option.Option<PlaygroundConfiguration> = (
  serialized: string,
) => {
  try {
    return Option.map(decodeCandidate(JSON.parse(serialized)), normalizeConfiguration)
  } catch {
    return Option.none()
  }
}

export const configurationQuery: (configuration: PlaygroundConfiguration) => string = (
  configuration: PlaygroundConfiguration,
) =>
  configuration._tag === 'none'
    ? ''
    : `props=${encodeURIComponent(serializeConfiguration(configuration))}`

export const configurationUrl: (
  href: string,
  path: string,
  configuration: PlaygroundConfiguration,
) => string = (href: string, path: string, configuration: PlaygroundConfiguration) => {
  const url = new URL(href)
  if (url.pathname !== path) return href
  if (configuration._tag === 'none') url.searchParams.delete('props')
  else url.searchParams.set('props', serializeConfiguration(configuration))
  return `${url.pathname}${url.search}${url.hash}`
}

export { legacyOptions } from './legacy'
