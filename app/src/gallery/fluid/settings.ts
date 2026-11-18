import { ContextMenuExample } from './data-components'
import { hoverModeOf as accordionHover } from '@foldkit-visuals/fluid/accordion'
import {
  hoverModeOf as askHover,
  radiusOf as askRadius,
} from '@foldkit-visuals/fluid/ask-user-questions'
import { hoverModeOf as breadcrumbHover } from '@foldkit-visuals/fluid/breadcrumb'
import { hoverModeOf as calendarHover } from '@foldkit-visuals/fluid/calendar'
import { hoverModeOf as cardHover } from '@foldkit-visuals/fluid/card'
import { hoverModeOf as carouselHover } from '@foldkit-visuals/fluid/carousel-dots'
import {
  hoverModeOf as checksHover,
  radiusOf as checksRadius,
} from '@foldkit-visuals/fluid/checkbox-group'
import {
  ColorPickerBlock,
  colorValueOf,
  hoverModeOf as colorHover,
  settingsOf as colorSettingsOf,
} from '@foldkit-visuals/fluid/color-picker'
import { hoverModeOf as comboHover } from '@foldkit-visuals/fluid/combobox'
import { hoverModeOf as commandHover } from '@foldkit-visuals/fluid/command-menu'
import { hoverModeOf as pickerHover, presentationOf } from '@foldkit-visuals/fluid/date-picker'
import { hoverModeOf as dropdownHover } from '@foldkit-visuals/fluid/dropdown'
import { hoverModeOf as groupHover } from '@foldkit-visuals/fluid/input-group'
import { hoverModeOf as composerHover } from '@foldkit-visuals/fluid/input-message'
import { hoverModeOf as navHover } from '@foldkit-visuals/fluid/nav-menu'
import { hoverModeOf as radioHover } from '@foldkit-visuals/fluid/radio-group'
import { hoverModeOf as selectHover } from '@foldkit-visuals/fluid/select'
import { hoverModeOf as workspaceHover } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { hoverModeOf as userHover } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { SliderBlock } from '@foldkit-visuals/fluid/slider'
import { hoverModeOf as tableHover } from '@foldkit-visuals/fluid/table'
import { hoverModeOf as tabsHover } from '@foldkit-visuals/fluid/tabs'
import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
import { accentSwatches } from '../../accents'
import { accentColor, type ComponentPresentation } from '../../settings'
import { FluidGalleryBlock } from './block'
import {
  Accordion,
  CardGroup,
  Carousel,
  Select,
  Slider,
  Table,
  Tabs,
  Volume,
} from './core-bindings'
import { Calendar, Picker } from './dates-bindings'
import {
  Breadcrumb,
  Checks,
  Color,
  Combo,
  Commands,
  CrumbHidden,
  CrumbMenu,
  Radio,
} from './details-bindings'
import {
  Ask,
  Composer,
  Dropdown,
  Group,
  SidebarWorkspace,
  SidebarUser,
  SidebarActions,
  Threads,
} from './interactive-bindings'

const sliderEqual = Schema.toEquivalence(SliderBlock.InMessage.RequestedSettings.fields.settings)
const colorEqual = Schema.toEquivalence(
  ColorPickerBlock.InMessage.RequestedConfigure.fields.settings,
)

export const coreSettings = (presentation: ComponentPresentation) =>
  FluidGalleryBlock.makeStep((model) => {
    const desired = presentation
    const mode = desired.hover
    const volume = { ...model.volume.settings, compact: desired.size === 'compact' }
    const slider = { ...model.slider.settings, compact: desired.size === 'compact' }
    return Update.combineSteps([
      ...(Option.isSome(model.contextMenuExample) &&
      model.contextMenuExample.value.menu.menu.hover.mode !== mode
        ? [ContextMenuExample.requestHoverMode({ mode })]
        : []),
      ...(selectHover(model.select) === mode ? [] : [Select.requestHoverMode({ mode })]),
      ...(tabsHover(model.tabs) === mode ? [] : [Tabs.requestHoverMode({ mode })]),
      ...(accordionHover(model.accordion) === mode ? [] : [Accordion.requestHoverMode({ mode })]),
      ...(carouselHover(model.carousel) === mode ? [] : [Carousel.requestHoverMode({ mode })]),
      ...(cardHover(model.cardGroup) === mode ? [] : [CardGroup.requestHoverMode({ mode })]),
      ...(tableHover(model.table) === mode ? [] : [Table.requestHoverMode({ mode })]),
      ...(sliderEqual(model.volume.settings, volume)
        ? []
        : [Volume.requestSettings({ settings: volume })]),
      ...(sliderEqual(model.slider.settings, slider)
        ? []
        : [Slider.requestSettings({ settings: slider })]),
    ])
  })

export const detailsSettings = (presentation: ComponentPresentation, preserveColor = false) =>
  FluidGalleryBlock.makeStep((model) => {
    const desired = presentation
    const mode = desired.hover
    const radius = desired.shape === 'sharp' ? 0 : desired.shape === 'pill' ? 16 : 8
    const currentColor = colorSettingsOf(model.color)
    const accent = accentColor(desired.accent, desired.theme)
    const color = {
      ...currentColor,
      // Equivalent reflected colors keep the picker owner's full-precision HSV.
      value:
        preserveColor || colorValueOf(model.color).toLowerCase() === accent.toLowerCase()
          ? currentColor.value
          : Option.some(accent),
      swatches: preserveColor ? currentColor.swatches : accentSwatches(desired.theme === 'dark'),
    }
    return Update.combineSteps([
      ...(colorEqual(currentColor, color) ? [] : [Color.requestConfigure({ settings: color })]),
      ...(checksRadius(model.checks) === radius ? [] : [Checks.requestRadius({ radius })]),
      ...(colorHover(model.color) === mode ? [] : [Color.requestHoverMode({ mode })]),
      ...(radioHover(model.radio) === mode ? [] : [Radio.requestHoverMode({ mode })]),
      ...(checksHover(model.checks) === mode ? [] : [Checks.requestHoverMode({ mode })]),
      ...(breadcrumbHover(model.breadcrumb) === mode
        ? []
        : [Breadcrumb.requestHoverMode({ mode })]),
      ...(comboHover(model.combo) === mode ? [] : [Combo.requestHoverMode({ mode })]),
      ...(commandHover(model.commands) === mode ? [] : [Commands.requestHoverMode({ mode })]),
      ...(dropdownHover(model.crumbMenu) === mode ? [] : [CrumbMenu.requestHoverMode({ mode })]),
      ...(dropdownHover(model.crumbHidden) === mode
        ? []
        : [CrumbHidden.requestHoverMode({ mode })]),
    ])
  })

export const interactiveSettings = (presentation: ComponentPresentation) =>
  FluidGalleryBlock.makeStep((model) => {
    const desired = presentation
    const mode = desired.hover
    const radius = desired.shape === 'sharp' ? 0 : desired.shape === 'pill' ? 16 : 8
    return Update.combineSteps([
      ...(composerHover(model.composer) === mode ? [] : [Composer.requestHoverMode({ mode })]),
      ...(dropdownHover(model.dropdown) === mode ? [] : [Dropdown.requestHoverMode({ mode })]),
      ...(askHover(model.ask) === mode ? [] : [Ask.requestHoverMode({ mode })]),
      ...(askRadius(model.ask) === radius ? [] : [Ask.requestRadius({ radius })]),
      ...(groupHover(model.group) === mode ? [] : [Group.requestHoverMode({ mode })]),
      ...(workspaceHover(model.sidebarWorkspace) === mode
        ? []
        : [SidebarWorkspace.requestHoverMode({ mode })]),
      ...(userHover(model.sidebarUser) === mode ? [] : [SidebarUser.requestHoverMode({ mode })]),
      ...(navHover(model.sidebarActions) === mode
        ? []
        : [SidebarActions.requestHoverMode({ mode })]),
      ...(navHover(model.threads) === mode ? [] : [Threads.requestHoverMode({ mode })]),
    ])
  })

export const datesSettings = (presentation: ComponentPresentation) =>
  FluidGalleryBlock.makeStep((model) => {
    const desired = presentation
    const current = presentationOf(model.picker)
    const compact = desired.size === 'compact'
    return Update.combineSteps([
      ...(calendarHover(model.calendar) === desired.hover
        ? []
        : [Calendar.requestHoverMode({ mode: desired.hover })]),
      ...(current.compact === compact ? [] : [Picker.requestDensity({ compact })]),
      ...(pickerHover(model.picker) === desired.hover
        ? []
        : [Picker.requestHoverMode({ mode: desired.hover })]),
    ])
  })

export const globalSettings = (presentation: ComponentPresentation, preserveColor = false) =>
  Update.combineSteps([
    coreSettings(presentation),
    detailsSettings(presentation, preserveColor),
    interactiveSettings(presentation),
    datesSettings(presentation),
  ])
