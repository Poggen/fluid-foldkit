import { BreadcrumbBlock } from '@foldkit-visuals/fluid/breadcrumb'
import { ChatMessageBlock } from '@foldkit-visuals/fluid/chat-message'
import { CheckboxGroupBlock } from '@foldkit-visuals/fluid/checkbox-group'
import { ColorPickerBlock } from '@foldkit-visuals/fluid/color-picker'
import { ComboboxBlock } from '@foldkit-visuals/fluid/combobox'
import { CommandMenuBlock } from '@foldkit-visuals/fluid/command-menu'
import { DropdownMenuBlock } from '@foldkit-visuals/fluid/dropdown'
import { RadioGroupBlock } from '@foldkit-visuals/fluid/radio-group'
import { ThinkingStepBlock } from '@foldkit-visuals/fluid/thinking-step'
import { ThinkingStepDetailsBlock, ThinkingStepsBlock } from '@foldkit-visuals/fluid/thinking-steps'
import { Option } from 'effect'
import { Update } from 'foldkit'
import { accentSwatches } from '../../accents'
import { FluidGalleryBlock, OutMessage } from './block'
import { commandItems } from './command-data'
import { RADIO_ITEMS } from './demo-data'
export const choices = [
  { value: 'accordion', label: 'Accordion' },
  { value: 'badge', label: 'Badge' },
  { value: 'button', label: 'Button' },
  { value: 'card', label: 'Card' },
  { value: 'checkbox-group', label: 'CheckboxGroup' },
  { value: 'color-picker', label: 'ColorPicker' },
  { value: 'combobox', label: 'Combobox' },
  { value: 'dialog', label: 'Dialog' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'input-group', label: 'InputGroup' },
  { value: 'radio-group', label: 'RadioGroup' },
  { value: 'select', label: 'Select' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'slider', label: 'Slider' },
  { value: 'switch', label: 'Switch' },
  { value: 'table', label: 'Table' },
  { value: 'tabs', label: 'Tabs' },
] as const
export const ColorRequests = FluidGalleryBlock.makeRequiredFieldBinding(ColorPickerBlock, {
  field: 'color',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-color',
        defaultValue: '#6B97FF',
        swatches: accentSwatches(false),
        hideEyedropper: false,
      },
    ],
  },
})
export const Color = ColorRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(ColorPickerBlock, {
    Events: ({ events }) =>
      FluidGalleryBlock.makeStep((model) => {
        const event = events.filter((event) => event.type === 'value').at(-1)
        return event === undefined
          ? { model }
          : FluidGalleryBlock.makeStep(() => {
              const configure = ColorRequests.requestConfigure({
                settings: { ...model.color.color.settings, value: Option.some(event.value) },
              })
              if (model.isPlayground) return configure
              return (connected: Parameters<typeof configure>[0]) =>
                Update.withOutMessage(
                  configure(connected),
                  OutMessage.UpdatedAccent({ accent: event.parsed.hex }),
                )
            })
      }),
  }),
})
export const RadioRequests = FluidGalleryBlock.makeRequiredFieldBinding(RadioGroupBlock, {
  field: 'radio',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-radio',
        selectedIndex: 1,
        items: RADIO_ITEMS.map((item, index) => ({ index, value: item.value })),
      },
    ],
  },
})
export const Radio = RadioRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(RadioGroupBlock, {
    Selected: ({ index }) => RadioRequests.requestSelection({ selectedIndex: index }),
  }),
})
export const ChecksRequests = FluidGalleryBlock.makeRequiredFieldBinding(CheckboxGroupBlock, {
  field: 'checks',
  init: { contextToArgs: () => [{ id: 'preview-checks', checkedIndices: [1, 2] }] },
})
export const Checks = ChecksRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(CheckboxGroupBlock, {
    Toggled: ({ index }) =>
      FluidGalleryBlock.makeStep((model) => {
        const checked =
          model.checks.checkedItems.find((item) => item.index === index)?.checked ?? false
        const items = model.checks.checkedItems.filter((item) => item.index !== index)
        const nextItems = [...items, { index, checked: !checked }]
        const indices = nextItems.filter((item) => item.checked).map((item) => item.index)

        return Update.combineSteps([
          ChecksRequests.requestItems({ items: nextItems }),
          ChecksRequests.requestSelection({ indices }),
        ])
      }),
  }),
})
export const StepsRequests = FluidGalleryBlock.makeRequiredFieldBinding(ThinkingStepsBlock, {
  field: 'steps',
  init: { contextToArgs: () => [{ id: 'preview-steps', defaultOpen: true }] },
})
export const Steps = StepsRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(ThinkingStepsBlock, {
    OpenChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
export const BreadcrumbRequests = FluidGalleryBlock.makeRequiredFieldBinding(BreadcrumbBlock, {
  field: 'breadcrumb',
  init: { contextToArgs: () => [{ id: 'preview-breadcrumb', count: 6 }] },
})
export const Breadcrumb = BreadcrumbRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(BreadcrumbBlock, {
    ExpandedChanged: FluidGalleryBlock.makeNoopStep,
    LayoutChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
const CrumbMenuRequests = FluidGalleryBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'crumbMenu',
  init: { contextToArgs: () => [{ id: 'preview-crumb-menu' }] },
})
export const CrumbMenu = CrumbMenuRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      FluidGalleryBlock.makeStep((model) => {
        const event = events.filter((event) => event._tag === 'Selected').at(-1)
        return event === undefined
          ? { model }
          : Update.combineSteps([
              FluidGalleryBlock.makeFieldsStep(() => ({ crumbSection: () => event.index })),
              CrumbMenuRequests.requestSelection({
                selection: {
                  checkedIndex: Option.some(event.index),
                  checkedIndices: Option.none(),
                },
              }),
            ])
      }),
  }),
})
export const CrumbHidden = FluidGalleryBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'crumbHidden',
  init: { contextToArgs: () => [{ id: 'preview-crumb-hidden' }] },
}).withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: FluidGalleryBlock.makeNoopStep,
  }),
})
export const ComboRequests = FluidGalleryBlock.makeRequiredFieldBinding(ComboboxBlock, {
  field: 'combo',
  init: {
    contextToArgs: () => [
      {
        disabled: false,
        id: 'preview-combo',
        items: choices,
        multiple: true,
        defaultValue: ['button', 'combobox'],
      },
    ],
  },
})
export const Combo = ComboRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(ComboboxBlock, {
    Selected: FluidGalleryBlock.makeNoopStep,
    ValuesChanged: FluidGalleryBlock.makeNoopStep,
    CreateRequested: ({ query }) =>
      ComboRequests.requestAcceptCreated({ item: { value: query, label: query } }),
  }),
})
export const ChatRequests = FluidGalleryBlock.makeRequiredFieldBinding(ChatMessageBlock, {
  field: 'chat',
  init: { contextToArgs: () => [{ id: 'preview-chat', from: 'assistant' as const }] },
})
export const Chat = ChatRequests
export const UserChat = FluidGalleryBlock.makeRequiredFieldBinding(ChatMessageBlock, {
  field: 'userChat',
  init: { contextToArgs: () => [{ id: 'preview-user-chat', from: 'user' as const }] },
})
export const Profile = FluidGalleryBlock.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'profile',
  init: { contextToArgs: () => [{ id: 'preview-profile', status: 'complete' as const }] },
})
export const Portfolio = FluidGalleryBlock.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'portfolio',
  init: { contextToArgs: () => [{ id: 'preview-portfolio', status: 'complete' as const }] },
})
export const Recent = FluidGalleryBlock.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'recent',
  init: { contextToArgs: () => [{ id: 'preview-recent', status: 'complete' as const }] },
})
export const Analysis = FluidGalleryBlock.makeRequiredFieldBinding(ThinkingStepBlock, {
  field: 'analysis',
  init: { contextToArgs: () => [{ id: 'preview-analysis', status: 'active' as const }] },
})
export const PortfolioDetails = FluidGalleryBlock.makeRequiredFieldBinding(
  ThinkingStepDetailsBlock,
  {
    field: 'portfolioDetails',
    init: { contextToArgs: () => [{ id: 'preview-portfolio-details' }] },
  },
).withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(ThinkingStepDetailsBlock, {
    OpenChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
export const CommandsRequests = FluidGalleryBlock.makeRequiredFieldBinding(CommandMenuBlock, {
  field: 'commands',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-commands',
        items: commandItems.map(({ icon: _icon, ...item }) => item),
        suggestions: ['calendar', 'new-file', 'settings'],
      },
    ],
  },
})
export const Commands = CommandsRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(CommandMenuBlock, {
    Selected: FluidGalleryBlock.makeNoopStep,
    QueryChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
export const detailsBindings = [
  Color,
  Radio,
  Checks,
  Steps,
  Breadcrumb,
  CrumbMenu,
  CrumbHidden,
  Combo,
  Chat,
  UserChat,
  Profile,
  Portfolio,
  Recent,
  Analysis,
  PortfolioDetails,
  Commands,
] as const
