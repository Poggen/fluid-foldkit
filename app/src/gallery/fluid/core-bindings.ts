import { Number } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { AccordionGroupBlock as AccordionBlock } from '@foldkit-visuals/fluid/accordion'
import { BannerBlock, createBannerMotionScope } from '@foldkit-visuals/fluid/banner'
import { CardGroupBlock } from '@foldkit-visuals/fluid/card'
import { CarouselDotsBlock } from '@foldkit-visuals/fluid/carousel-dots'
import { CheckboxBlock } from '@foldkit-visuals/fluid/checkbox'
import { InputBlock } from '@foldkit-visuals/fluid/input'
import { SelectBlock } from '@foldkit-visuals/fluid/select'
import { SliderBlock } from '@foldkit-visuals/fluid/slider'
import { createSliderMotionScope } from '@foldkit-visuals/fluid/slider-motion'
import { SwitchBlock, createSwitchMotionScope } from '@foldkit-visuals/fluid/switch'
import { TableBlock } from '@foldkit-visuals/fluid/table'
import { TabsBlock } from '@foldkit-visuals/fluid/tabs'
import { TextareaBlock } from '@foldkit-visuals/fluid/textarea'
import { ThinkingIndicatorBlock } from '@foldkit-visuals/fluid/thinking-indicator'
import { Update } from 'foldkit'
import { FluidGalleryBlock } from './block'
import { ACCORDION_ITEMS, SELECT_ROLES } from './demo-data'
import { WaitBeforeRestoreBanner } from './effects'
export const switchMotion = createSwitchMotionScope('showcase-switch')
export const bannerMotion = createBannerMotionScope()
export const sliderMotion = createSliderMotionScope('showcase-slider')
export const InputRequests = FluidGalleryBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'input',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-input',
        value: '',
        disabled: false,
        readOnly: false,
      },
    ],
  },
})
export const Input = InputRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(InputBlock, {
    Changed: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        InputRequests.requestConfigure({
          value,
          disabled: model.input.disabled,
          readOnly: model.input.readOnly,
        }),
      ),
    FilesChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
export const TextareaRequests = FluidGalleryBlock.makeRequiredFieldBinding(TextareaBlock, {
  field: 'textarea',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-textarea',
        value: '',
        disabled: false,
        readOnly: false,
      },
    ],
  },
})
export const Textarea = TextareaRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(TextareaBlock, {
    Changed: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        TextareaRequests.requestConfigure({
          value,
          disabled: model.textarea.disabled,
          readOnly: model.textarea.readOnly,
        }),
      ),
  }),
})
export const CheckboxRequests = FluidGalleryBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'checkbox',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-checkbox',
        checked: true,
        disabled: false,
      },
    ],
  },
})
export const Checkbox = CheckboxRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      FluidGalleryBlock.makeStep((model) =>
        CheckboxRequests.requestConfigure({
          checked,
          disabled: model.checkbox.disabled,
          readOnly: model.checkbox.readOnly,
        }),
      ),
  }),
})
export const SwitchRequests = FluidGalleryBlock.makeRequiredFieldBinding(SwitchBlock, {
  field: 'switch',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-switch',
        checked: true,
        disabled: false,
      },
    ],
  },
})
export const Switch = SwitchRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(SwitchBlock, {
    Toggled: () =>
      FluidGalleryBlock.makeStep((model) =>
        SwitchRequests.requestConfigure({
          checked: !model.switch.checked,
          disabled: model.switch.disabled,
        }),
      ),
  }),
})
export const SoundRequests = FluidGalleryBlock.makeRequiredFieldBinding(SwitchBlock, {
  field: 'sound',
  init: { contextToArgs: () => [{ id: 'preview-sound', checked: false }] },
})
export const Sound = SoundRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(SwitchBlock, {
    Toggled: () =>
      FluidGalleryBlock.makeStep((model) =>
        SoundRequests.requestConfigure({ checked: !model.sound.checked, disabled: false }),
      ),
  }),
})
export const SelectRequests = FluidGalleryBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'select',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-select',
        disabled: false,
        items: SELECT_ROLES.map((label) => ({ value: label, label })),
        defaultValue: 'Viewer',
      },
    ],
  },
})
export const Select = SelectRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(SelectBlock, {
    Selected: FluidGalleryBlock.makeNoopStep,
    OpenChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
export const TabsRequests = FluidGalleryBlock.makeRequiredFieldBinding(TabsBlock, {
  field: 'tabs',
  init: { contextToArgs: () => [{ id: 'preview-tabs', selectedIndex: 0, activeLabel: true }] },
})
export const Tabs = TabsRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(TabsBlock, {
    Selected: ({ index }) => TabsRequests.requestSelected({ selectedIndex: index }),
  }),
})
export const AccordionRequests = FluidGalleryBlock.makeRequiredFieldBinding(AccordionBlock, {
  field: 'accordion',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-accordion',
        type: 'single' as const,
        collapsible: true,
        highlight: 'item' as const,
        disabled: false,
        items: ACCORDION_ITEMS.map(({ value }, index) => ({ value, index })),
        defaultValue: 'item-1',
      },
    ],
  },
})
export const Accordion = AccordionRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(AccordionBlock, {
    ValueChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
export const Thinking = FluidGalleryBlock.makeRequiredFieldBinding(ThinkingIndicatorBlock, {
  field: 'thinking',
  init: { contextToArgs: () => [{ id: 'preview-thinking', reduceMotion: false }] },
})
export const SliderRequests = FluidGalleryBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'slider',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-slider',
        value: 35,
        min: 0,
        max: 100,
        step: 1,
        disabled: false,
        variant: 'pips' as const,
      },
    ],
  },
})
export const Slider = SliderRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(SliderBlock, {
    Changed: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        SliderRequests.requestSettings({ settings: { ...model.slider.settings, value } }),
      ),
  }),
})
export const VolumeRequests = FluidGalleryBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'volume',
  init: {
    contextToArgs: () => [{ id: 'preview-volume', value: 60, variant: 'scrubber' as const }],
  },
})
export const Volume = VolumeRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(SliderBlock, {
    Changed: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        VolumeRequests.requestSettings({ settings: { ...model.volume.settings, value } }),
      ),
  }),
})
export const CarouselRequests = FluidGalleryBlock.makeRequiredFieldBinding(CarouselDotsBlock, {
  field: 'carousel',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-carousel',
        count: 4,
        value: 0,
        autoplay: { duration: 2400, loop: true },
      },
    ],
  },
})
export const Carousel = CarouselRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(CarouselDotsBlock, {
    ValueChanged: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        Update.combineSteps([
          FluidGalleryBlock.makeFieldsStep(() => ({
            carouselPrevious: () => value,
            isCarouselManual: () => false,
            carouselDirection: () =>
              model.isCarouselManual ? (value > model.carouselPrevious ? 1 : -1) : 1,
          })),
          CarouselRequests.requestConfigure({
            config: {
              id: 'preview-carousel',
              count: model.carousel.clock.count,
              value,
              autoplay: !model.carousel.clock.autoplay
                ? false
                : {
                    duration: model.carousel.clock.duration,
                    loop: model.carousel.clock.loop,
                    paused: model.isCarouselPaused,
                  },
            },
          }),
        ]),
      ),
  }),
})
export const BannerRequests = FluidGalleryBlock.makeRequiredFieldBinding(BannerBlock, {
  field: 'banner',
  init: { contextToArgs: () => [{ id: 'preview-banner', reduceMotion: false }] },
})
export const Banner = BannerRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(BannerBlock, {
    Dismissed: () =>
      FluidGalleryBlock.makeStep((model) =>
        model.isPlayground
          ? { model }
          : {
              model: modifyFields(model, { bannerReset: Number.increment }),
              commands: [WaitBeforeRestoreBanner({ generation: model.bannerReset + 1 })],
            },
      ),
    Exited: FluidGalleryBlock.makeNoopStep,
  }),
})
export const SearchRequests = FluidGalleryBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'search',
  init: {
    contextToArgs: () => [
      {
        id: 'preview-field-input',
        value: '',
        disabled: false,
        readOnly: false,
      },
    ],
  },
})
export const Search = SearchRequests.withOutMessagePolicy({
  fold: FluidGalleryBlock.makeOutMessageFold(InputBlock, {
    Changed: ({ value }) =>
      FluidGalleryBlock.makeStep((model) =>
        SearchRequests.requestConfigure({
          value,
          disabled: model.search.disabled,
          readOnly: model.search.readOnly,
        }),
      ),
    FilesChanged: FluidGalleryBlock.makeNoopStep,
  }),
})
export const CardGroup = FluidGalleryBlock.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'cardGroup',
  init: { contextToArgs: () => [{ id: 'preview-card-group' }] },
})
export const Table = FluidGalleryBlock.makeRequiredFieldBinding(TableBlock, {
  field: 'table',
  init: { contextToArgs: () => [{ id: 'preview-table' }] },
})
export const coreBindings = [
  Input,
  Textarea,
  Checkbox,
  Switch,
  Sound,
  Select,
  Tabs,
  Accordion,
  Thinking,
  Slider,
  Volume,
  Carousel,
  Banner,
  Search,
  CardGroup,
  Table,
] as const
