import { layer as ScrollAreaLayer } from '@foldkit-visuals/fluid/scroll-area'
import { ConfiguredSidebarLayer } from './blocks'
import { ConfiguredSidebarBinding } from './configured-sidebar-binding'
import { composerConfiguration } from './composer-configuration'
import { Composer } from './interactive-bindings'
import { AccordionGroupLayer as AccordionLayer } from '@foldkit-visuals/fluid/accordion'
import { layer as AskLayer } from '@foldkit-visuals/fluid/ask-user-questions'
import { layer as BannerLayer } from '@foldkit-visuals/fluid/banner'
import { layer as BreadcrumbLayer } from '@foldkit-visuals/fluid/breadcrumb'
import { layer as CalendarLayer, calendarTooltipKeys } from '@foldkit-visuals/fluid/calendar'
import { layer as CardLayer } from '@foldkit-visuals/fluid/card'
import {
  CarouselDotsResourcesDefaultLayer,
  layer as CarouselLayer,
} from '@foldkit-visuals/fluid/carousel-dots'
import { layer as ChatLayer } from '@foldkit-visuals/fluid/chat-message'
import { layer as CheckboxLayer } from '@foldkit-visuals/fluid/checkbox'
import { layer as ChecksLayer } from '@foldkit-visuals/fluid/checkbox-group'
import { layer as ColorLayer } from '@foldkit-visuals/fluid/color-picker'
import { layer as ComboLayer } from '@foldkit-visuals/fluid/combobox'
import { CommandMenuDialogLayer } from '@foldkit-visuals/fluid/command-menu-dialog'
import { CommandMenuTabsLayer as CommandTabsLayer } from '@foldkit-visuals/fluid/command-menu-tabs'
import { CommandMenuLayer } from '@foldkit-visuals/fluid/command-menu'
import { layer as PickerLayer } from '@foldkit-visuals/fluid/date-picker'
import { DialogLayer } from '@foldkit-visuals/fluid/dialog'
import {
  layer as DropdownLayer,
  menuLayer as DropdownMenuLayer,
  subLayer as DropdownSubLayer,
} from '@foldkit-visuals/fluid/dropdown'
import { layer as InputLayer } from '@foldkit-visuals/fluid/input'
import { layer as CopyLayer } from '@foldkit-visuals/fluid/input-copy'
import { layer as FieldLayer } from '@foldkit-visuals/fluid/input-field'
import { layer as GroupLayer } from '@foldkit-visuals/fluid/input-group'
import { layer as ComposerLayer } from '@foldkit-visuals/fluid/input-message'
import { navMenuLayer } from '@foldkit-visuals/fluid/nav-menu'
import { layer as PresenceLayer } from '@foldkit-visuals/fluid/presence'
import { layer as RadioLayer } from '@foldkit-visuals/fluid/radio-group'
import { layer as SelectLayer } from '@foldkit-visuals/fluid/select'
import { sidebarLayer } from '@foldkit-visuals/fluid/sidebar'
import { SidebarWorkspaceHeaderLayer } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarUserFooterLayer } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { layer as SliderLayer } from '@foldkit-visuals/fluid/slider'
import { SwitchLayer } from '@foldkit-visuals/fluid/switch'
import { layer as TableLayer } from '@foldkit-visuals/fluid/table'
import { layer as TabsLayer } from '@foldkit-visuals/fluid/tabs'
import { layer as TextareaLayer } from '@foldkit-visuals/fluid/textarea'
import { layer as ThinkingLayer } from '@foldkit-visuals/fluid/thinking-indicator'
import { layer as ThinkingRowLayer } from '@foldkit-visuals/fluid/thinking-step'
import { ThinkingStepDetailsLayer, ThinkingStepsLayer } from '@foldkit-visuals/fluid/thinking-steps'
import { layer as TooltipLayer } from '@foldkit-visuals/fluid/tooltip'
import { Layer, Option } from 'effect'
import { Update } from 'foldkit'
import { GalleryFlags } from '../flags'
import { FluidGalleryBlock } from './block'
import { FluidGalleryComposition, makeView } from './composition'
import { Banner, Carousel } from './core-bindings'
import { Calendar, CalendarTooltips } from './dates-bindings'
import { CopyBanner, WaitBeforeRestoreBanner } from './effects'
import { Sidebar, Tooltips } from './interactive-bindings'
import { applyConfiguration } from './configuration-update'
import { globalSettings } from './settings'
const dateInit = (flags: typeof GalleryFlags.Type) => ({
  model: {
    isPlayground: false,
    configuredSidebar: Option.none(),
    cardSelectedIndex: 0,
    cardDismissedIndices: [],
    composerHistory: ['Make my input box feel less stiff'],
    dropdownQuery: '',
    dropdownTheme: 'System',
    dropdownCreatedItems: [],
    dropdownSelectedValues: ['Email'],
    pickerSelections: flags.calendarSelections,
    pickerTime: '11:00',
    pickerTimeRange: { start: '11:00', end: '12:45' },
    threadSearch: '',
    calendarSelections: flags.calendarSelections,
    isNarrow: false,
    crumbSection: null,
    bannerReset: 0,
    isCarouselManual: false,
    isCarouselPaused: false,
    carouselDirection: 1 as const,
    carouselPrevious: 0,
  },
  childInitContext: flags,
  steps: [...calendarTooltipKeys('gallery-calendar'), ...calendarTooltipKeys('gallery-picker')].map(
    (key) => CalendarTooltips.requestAdd({ key }),
  ),
})
const implementation = {
  init: FluidGalleryComposition.makeInit((flags) => {
    const dateResult = dateInit(flags)
    return {
      ...dateResult,
      steps: [
        ...(dateResult.steps ?? []),
        ...['basic', 'tooltip-neighbor', 'tooltip-third', 'copy', 'composer'].map((key) =>
          Tooltips.requestAdd({
            key,
            ...(['basic', 'tooltip-neighbor', 'tooltip-third'].includes(key)
              ? { groupKey: 'playground-tooltip' }
              : {}),
            options: { side: 'top' },
          }),
        ),
      ],
    }
  }),
  update: FluidGalleryComposition.makeUpdate({
    InformedOfComposerSamples: FluidGalleryBlock.makeStep(
      (model, { files }: typeof FluidGalleryBlock.Message.InformedOfComposerSamples.Type) =>
        Composer.requestConfigure({ ...composerConfiguration(model.composer), files }),
    ),

    SelectedCard: FluidGalleryBlock.makeFieldsStep.fromMessage(({ index }) => ({
      cardSelectedIndex: () => index,
    })),
    DismissedCard: FluidGalleryBlock.makeFieldsStep((model, { index }) => ({
      cardDismissedIndices: () =>
        model.cardDismissedIndices.includes(index)
          ? model.cardDismissedIndices
          : [...model.cardDismissedIndices, index],
    })),
    ChangedDropdownQuery: FluidGalleryBlock.makeFieldsStep.fromMessage(({ value }) => ({
      dropdownQuery: () => value,
    })),
    CreatedDropdownItem: FluidGalleryBlock.makeFieldsStep((model, { label }) => ({
      dropdownQuery: () => '',
      dropdownCreatedItems: () =>
        model.dropdownCreatedItems.some((item) => item.label === label)
          ? model.dropdownCreatedItems
          : [...model.dropdownCreatedItems, { value: label, label }],
    })),
    UpdatedThreadSearch: FluidGalleryBlock.makeFieldsStep((_model, { value }) => ({
      threadSearch: () => value,
    })),
    PickedCarousel: FluidGalleryBlock.makeFieldsStep(() => ({ isCarouselManual: () => true })),
    CompletedWaitBeforeRestoreBanner: FluidGalleryBlock.makeStep((model, { generation }) =>
      generation === model.bannerReset ? Banner.requestReset() : FluidGalleryBlock.makeNoopStep(),
    ),
    DismissedBanner: Banner.requestDismiss(),
    RequestedCopyBanner: FluidGalleryBlock.makeCommandsStep(() => [CopyBanner()]),
    CompletedCopyBanner: FluidGalleryBlock.makeNoopStep(),
    HoveredCarousel: FluidGalleryBlock.makeStep((model, { paused }) =>
      Update.combineSteps([
        FluidGalleryBlock.makeFieldsStep(() => ({ isCarouselPaused: () => paused })),
        Carousel.requestConfigure({
          config: {
            id: 'preview-carousel',
            count: model.carousel.clock.count,
            value: model.carousel.clock.value,
            autoplay: !model.carousel.clock.autoplay
              ? false
              : {
                  duration: model.carousel.clock.duration,
                  loop: model.carousel.clock.loop,
                  paused,
                },
          },
        }),
      ]),
    ),
    Refreshed: FluidGalleryBlock.makeNoopStep(),
  }),
  inMessageUpdate: FluidGalleryComposition.makeInMessageUpdate({
    InformedOfConfiguration: applyConfiguration,
    InformedOfViewport: FluidGalleryBlock.makeStep((model, { narrow }) =>
      model.isPlayground
        ? FluidGalleryBlock.makeFieldsStep(() => ({ isNarrow: () => narrow }))
        : model.isNarrow === narrow
          ? { model }
          : Update.combineSteps([
              FluidGalleryBlock.makeFieldsStep(() => ({ isNarrow: () => narrow })),
              Calendar.requestPresentation({
                presentation: {
                  numberOfMonths: narrow ? 1 : 2,
                  orientation: 'horizontal',
                },
              }),
              Sidebar.requestWidth({
                width: narrow ? '100%' : '224px',
              }),
            ]),
    ),

    InformedOfPresentation: FluidGalleryBlock.makeStep((model, { presentation }) =>
      Update.combineSteps([
        globalSettings(presentation),
        ...(Option.isSome(model.configuredSidebar)
          ? [ConfiguredSidebarBinding.informOfPresentation({ presentation })]
          : []),
      ]),
    ),
  }),
  EffectsLayer: Layer.mergeAll(WaitBeforeRestoreBanner.layer, CopyBanner.layer),
}
export const layer = Layer.suspend(() =>
  FluidGalleryBlock.makeLayer({ ...implementation, view: makeView() }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      ConfiguredSidebarLayer,
      AccordionLayer,
      navMenuLayer,
      BannerLayer,
      CardLayer,
      CarouselLayer,
      CheckboxLayer,
      InputLayer,
      SelectLayer,
      SliderLayer,
      SwitchLayer,
      TableLayer,
      TabsLayer,
      TextareaLayer,
      ThinkingLayer,
      BreadcrumbLayer,
      ChatLayer,
      ChecksLayer,
      ColorLayer,
      ComboLayer,
      CommandMenuLayer,
      CommandMenuDialogLayer,
      CommandTabsLayer,
      DropdownSubLayer,
      RadioLayer,
      PresenceLayer,
      ThinkingStepsLayer,
      ThinkingStepDetailsLayer,
      ThinkingRowLayer,
      AskLayer,
      DialogLayer,
      DropdownLayer,
      DropdownMenuLayer,
      CopyLayer,
      FieldLayer,
      GroupLayer,
      ComposerLayer,
      sidebarLayer,
      ScrollAreaLayer,
      SidebarWorkspaceHeaderLayer,
      SidebarUserFooterLayer,
      TooltipLayer,
      CalendarLayer,
      PickerLayer,
    ).pipe(Layer.provide(CarouselDotsResourcesDefaultLayer)),
  ),
)
export { FluidGalleryBlock } from './block'

export { configuredSidebarOpen } from './selectors'
