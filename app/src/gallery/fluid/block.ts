import { CodeBlockExampleBlock } from '../../../../registry/fluid/examples/src/code-block-example-block'
import { ContextMenuExampleBlock } from '../../../../registry/fluid/examples/src/context-menu-example-block'
import { DataTableExampleBlock } from '../../../../registry/fluid/examples/src/data-table-example-block'
import { ScrollAreaBlock } from '@foldkit-visuals/fluid/scroll-area'
import { ConfiguredSidebarBlock } from './blocks'
import { AccordionGroupBlock as AccordionBlock } from '@foldkit-visuals/fluid/accordion'
import { AskUserQuestionsBlock } from '@foldkit-visuals/fluid/ask-user-questions'
import { BannerBlock } from '@foldkit-visuals/fluid/banner'
import { BreadcrumbBlock } from '@foldkit-visuals/fluid/breadcrumb'
import { CalendarBlock } from '@foldkit-visuals/fluid/calendar'
import { CardGroupBlock } from '@foldkit-visuals/fluid/card'
import { CarouselDotsBlock } from '@foldkit-visuals/fluid/carousel-dots'
import { ChatMessageBlock } from '@foldkit-visuals/fluid/chat-message'
import { CheckboxBlock } from '@foldkit-visuals/fluid/checkbox'
import { CheckboxGroupBlock } from '@foldkit-visuals/fluid/checkbox-group'
import { ColorPickerBlock } from '@foldkit-visuals/fluid/color-picker'
import { ComboboxBlock } from '@foldkit-visuals/fluid/combobox'
import { CommandMenuDialogBlock } from '@foldkit-visuals/fluid/command-menu-dialog'
import { CommandMenuTabsBlock } from '@foldkit-visuals/fluid/command-menu-tabs'
import { CommandMenuBlock } from '@foldkit-visuals/fluid/command-menu'
import { DatePickerBlock } from '@foldkit-visuals/fluid/date-picker'
import { DialogBlock } from '@foldkit-visuals/fluid/dialog'
import { DropdownBlock, DropdownMenuBlock, DropdownSubBlock } from '@foldkit-visuals/fluid/dropdown'
import { InputBlock } from '@foldkit-visuals/fluid/input'
import { InputCopyBlock } from '@foldkit-visuals/fluid/input-copy'
import { InputFieldBlock } from '@foldkit-visuals/fluid/input-field'
import { InputGroupBlock } from '@foldkit-visuals/fluid/input-group'
import { MessageFile } from '@foldkit-visuals/fluid/input-message'
import { InputMessageBlock } from '@foldkit-visuals/fluid/input-message'
import { NavMenuBlock } from '@foldkit-visuals/fluid/nav-menu'
import { RadioGroupBlock } from '@foldkit-visuals/fluid/radio-group'
import { SelectBlock } from '@foldkit-visuals/fluid/select'
import { SidebarBlock } from '@foldkit-visuals/fluid/sidebar'
import { SidebarWorkspaceHeaderBlock } from '@foldkit-visuals/fluid/sidebar/workspace-header'
import { SidebarUserFooterBlock } from '@foldkit-visuals/fluid/sidebar/user-footer'
import { SliderBlock } from '@foldkit-visuals/fluid/slider'
import { SwitchBlock } from '@foldkit-visuals/fluid/switch'
import { TableBlock } from '@foldkit-visuals/fluid/table'
import { TabsBlock } from '@foldkit-visuals/fluid/tabs'
import { TextareaBlock } from '@foldkit-visuals/fluid/textarea'
import { ThinkingIndicatorBlock } from '@foldkit-visuals/fluid/thinking-indicator'
import { ThinkingStepBlock } from '@foldkit-visuals/fluid/thinking-step'
import { ThinkingStepDetailsBlock, ThinkingStepsBlock } from '@foldkit-visuals/fluid/thinking-steps'
import { DocumentTooltipBlock } from '@foldkit-visuals/fluid/tooltip'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { SiteEnvironment } from '../../environment'
import { PlaygroundConfiguration } from '../../playground/configuration'
import { ComponentPresentation, type ResolvedSettings as Settings } from '../../settings'
import { CalendarSelections, GalleryFlags } from '../flags'
export const FluidGalleryFlags = Schema.Struct({
  calendar: GalleryFlags.fields.calendar,
  calendarSelections: GalleryFlags.fields.calendarSelections,
  picker: GalleryFlags.fields.picker,
  componentSlug: GalleryFlags.fields.componentSlug,
})
export interface FluidGalleryInputs {
  readonly settings: Settings
  readonly configuration?: PlaygroundConfiguration
  readonly ready: boolean
  readonly admitted: ReadonlyArray<string>
  readonly only?: string
}
export const OutMessage = defineMessageUnion({ UpdatedAccent: { accent: Schema.String } })
const Message = defineMessageUnion({
  InformedOfComposerSamples: { files: Schema.Array(MessageFile) },
  SelectedCard: { index: Schema.Natural },
  DismissedCard: { index: Schema.Natural },
  ChangedDropdownQuery: { value: Schema.String },
  CreatedDropdownItem: { label: Schema.String },
  UpdatedThreadSearch: { value: Schema.String },
  PickedCarousel: {},
  Refreshed: {},
  CompletedWaitBeforeRestoreBanner: { generation: Schema.Natural },
  DismissedBanner: {},
  CompletedCopyBanner: { success: Schema.Boolean },
  RequestedCopyBanner: {},
  HoveredCarousel: { paused: Schema.Boolean },
})
const key = Symbol('FluidGallery')
export const FluidGalleryBlock = Block.make('FluidGallery', {
  key,
  InitArgs: Schema.Tuple([FluidGalleryFlags]),
  ChildInitContext: FluidGalleryFlags,
  Model: Schema.Struct({
    isPlayground: Schema.Boolean,
    codeBlockExample: Schema.Option(CodeBlockExampleBlock.Model),
    contextMenuExample: Schema.Option(ContextMenuExampleBlock.Model),
    dataTableExample: Schema.Option(DataTableExampleBlock.Model),
    configuredSidebar: Schema.Option(ConfiguredSidebarBlock.Model),
    cardSelectedIndex: Schema.Natural,
    cardDismissedIndices: Schema.Array(Schema.Natural),
    composerHistory: Schema.Array(Schema.String),
    commandDialog: CommandMenuDialogBlock.Model,
    commandTabs: CommandMenuTabsBlock.Model,
    commandFilter: SelectBlock.Model,
    commandSort: SelectBlock.Model,
    dropdownPopup: DropdownMenuBlock.Model,
    dropdownThemeMenu: DropdownSubBlock.Model,
    dropdownQuery: Schema.String,
    dropdownTheme: Schema.String,
    dropdownCreatedItems: Schema.Array(
      Schema.Struct({ value: Schema.String, label: Schema.String }),
    ),
    dropdownSelectedValues: Schema.Array(Schema.String),
    pickerSelections: CalendarSelections,
    pickerTime: Schema.NullOr(Schema.String),
    pickerTimeRange: Schema.NullOr(Schema.Struct({ start: Schema.String, end: Schema.String })),
    isNarrow: Schema.Boolean,
    bannerReset: Schema.Natural,
    isCarouselManual: Schema.Boolean,
    isCarouselPaused: Schema.Boolean,
    carouselDirection: Schema.Literals([-1, 1]),
    carouselPrevious: Schema.Natural,
    input: InputBlock.Model,
    textarea: TextareaBlock.Model,
    checkbox: CheckboxBlock.Model,
    switch: SwitchBlock.Model,
    sound: SwitchBlock.Model,
    select: SelectBlock.Model,
    tabs: TabsBlock.Model,
    accordion: AccordionBlock.Model,
    thinking: ThinkingIndicatorBlock.Model,
    slider: SliderBlock.Model,
    volume: SliderBlock.Model,
    carousel: CarouselDotsBlock.Model,
    banner: BannerBlock.Model,
    search: InputBlock.Model,
    cardGroup: CardGroupBlock.Model,
    table: TableBlock.Model,
    color: ColorPickerBlock.Model,
    radio: RadioGroupBlock.Model,
    checks: CheckboxGroupBlock.Model,
    steps: ThinkingStepsBlock.Model,
    profile: ThinkingStepBlock.Model,
    portfolio: ThinkingStepBlock.Model,
    recent: ThinkingStepBlock.Model,
    analysis: ThinkingStepBlock.Model,
    portfolioDetails: ThinkingStepDetailsBlock.Model,
    breadcrumb: BreadcrumbBlock.Model,
    combo: ComboboxBlock.Model,
    chat: ChatMessageBlock.Model,
    userChat: ChatMessageBlock.Model,
    commands: CommandMenuBlock.Model,
    composer: InputMessageBlock.Model,
    copy: InputCopyBlock.Model,
    dialog: DialogBlock.Model,
    dropdown: DropdownBlock.Model,
    ask: AskUserQuestionsBlock.Model,
    group: InputGroupBlock.Model,
    first: InputFieldBlock.Model,
    last: InputFieldBlock.Model,
    website: InputFieldBlock.Model,
    sidebar: SidebarBlock.Model,
    sidebarScroll: ScrollAreaBlock.Model,
    threads: NavMenuBlock.Model,
    sidebarWorkspace: SidebarWorkspaceHeaderBlock.Model,
    sidebarUser: SidebarUserFooterBlock.Model,
    sidebarActions: NavMenuBlock.Model,
    threadSearch: Schema.String,
    crumbMenu: DropdownMenuBlock.Model,
    crumbHidden: DropdownMenuBlock.Model,
    crumbSection: Schema.NullOr(Schema.Natural),
    tooltips: DocumentTooltipBlock.Model,
    calendar: CalendarBlock.Model,
    calendarSelections: CalendarSelections,
    picker: DatePickerBlock.Model,
    calendarTooltips: DocumentTooltipBlock.Model,
  }),
  OutMessage,
  Message,
  operations: { informOfComposerSamples: Message.InformedOfComposerSamples },
  InMessage: defineInMessageUnion({
    InformedOfConfiguration: {
      configuration: PlaygroundConfiguration,
      presentation: ComponentPresentation,
      edited: Schema.optionalKey(Schema.Array(Schema.String)),
      intent: Schema.optionalKey(Schema.Literals(['initialize', 'edit', 'reconcile', 'reset'])),
    },
    InformedOfPresentation: { presentation: ComponentPresentation },
    InformedOfViewport: { narrow: Schema.Boolean },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof CodeBlockExampleBlock>['programRequirements']
    | Block.FactsOf<typeof DataTableExampleBlock>['programRequirements']
    | SiteEnvironment
    | Block.FactsOf<typeof InputBlock>['programRequirements']
    | Block.FactsOf<typeof CarouselDotsBlock>['programRequirements']
    | Block.FactsOf<typeof CardGroupBlock>['programRequirements']
    | Block.FactsOf<typeof ColorPickerBlock>['programRequirements']
    | Block.FactsOf<typeof ChatMessageBlock>['programRequirements']
    | Block.FactsOf<typeof InputMessageBlock>['programRequirements']
    | Block.FactsOf<typeof InputCopyBlock>['programRequirements']
    | Block.FactsOf<typeof DialogBlock>['programRequirements']
    | Block.FactsOf<typeof DropdownBlock>['programRequirements']
    | Block.FactsOf<typeof AskUserQuestionsBlock>['programRequirements']
    | Block.FactsOf<typeof DocumentTooltipBlock>['programRequirements']
    | Block.FactsOf<typeof CalendarBlock>['programRequirements']
    | Block.FactsOf<typeof DatePickerBlock>['programRequirements']
  >(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<FluidGalleryInputs>() },
})
export type FluidGalleryModel = typeof FluidGalleryBlock.Model.Type
