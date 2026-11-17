import { settingsFor } from '../../playground/configs/slider'
import { Match, Schema } from 'effect'
import { Update } from 'foldkit'
import { SliderBlock } from '@foldkit-visuals/fluid/slider'
import type { FluidConfiguration } from '../../playground/configuration'
import type { ComponentPresentation } from '../../settings'
import { FluidGalleryBlock } from './block'
import { Carousel, Slider, Tabs } from './core-bindings'
import { Checks, Radio, Steps, Profile } from './details-bindings'

const sliderEqual = Schema.toEquivalence(SliderBlock.InMessage.RequestedSettings.fields.settings)
export const reconcileSimpleState = (
  configuration: Extract<
    FluidConfiguration,
    {
      readonly _tag:
        | 'tabs'
        | 'slider'
        | 'checkbox-group'
        | 'radio-group'
        | 'thinking-steps'
        | 'carousel-dots'
    }
  >,
  presentation: ComponentPresentation,
  edited?: ReadonlyArray<string>,
) =>
  FluidGalleryBlock.makeStep((model) =>
    Match.value(configuration).pipe(
      Match.tag('tabs', (c) =>
        Update.combineSteps([
          ...(model.tabs.activeLabel === c.activeLabel
            ? []
            : [Tabs.requestActiveLabel({ activeLabel: c.activeLabel })]),
          ...(model.tabs.selectedIndex < c.count
            ? []
            : [Tabs.requestSelected({ selectedIndex: c.count - 1 })]),
        ]),
      ),
      Match.tag('slider', (c) => {
        const settings = settingsFor(c, model.slider.id, presentation.size)
        return sliderEqual(model.slider.settings, settings)
          ? FluidGalleryBlock.makeNoopStep()
          : Slider.requestSettings({ settings })
      }),
      Match.tag('checkbox-group', (c) => {
        if (model.checks.checkedItems.length === c.count) return FluidGalleryBlock.makeNoopStep()
        const items = Array.from({ length: c.count }, (_, index) => ({
          index,
          checked: model.checks.checkedItems.find((item) => item.index === index)?.checked ?? false,
        }))

        return Update.combineSteps([
          Checks.requestItems({ items }),
          Checks.requestSelection({
            indices: items.filter((item) => item.checked).map((item) => item.index),
          }),
        ])
      }),
      Match.tag('radio-group', (c) =>
        model.radio.values.length === c.count
          ? FluidGalleryBlock.makeNoopStep()
          : Radio.requestItems({
              items: Array.from({ length: c.count }, (_, index) => ({
                index,
                value: `option-${index}`,
              })),
            }),
      ),
      Match.tag('thinking-steps', (c) =>
        Update.combineSteps([
          ...(edited !== undefined &&
          !['open', 'disabled', 'running', 'control'].some((field) => edited.includes(field))
            ? []
            : [
                Steps.requestConfigure({
                  open: c.control === 'controlled' ? c.open : null,
                  disabled: c.disabled,
                  defaultOpen: c.open,
                  running: c.running === 'unset' ? null : c.running === 'running',
                }),
              ]),
          ...(model.profile.status === c.status
            ? []
            : [Profile.requestConfigure({ status: c.status })]),
        ]),
      ),
      Match.tag('carousel-dots', (c) =>
        model.carousel.clock.count === c.count &&
        model.carousel.clock.autoplay === c.autoplay &&
        (!c.autoplay ||
          (model.carousel.clock.duration === c.duration && model.carousel.clock.loop === c.loop))
          ? FluidGalleryBlock.makeNoopStep()
          : Carousel.requestConfigure({
              config: {
                id: model.carousel.id,
                count: c.count,
                value: Math.min(model.carousel.clock.value, c.count - 1),
                autoplay: c.autoplay
                  ? { duration: c.duration, loop: c.loop, paused: model.isCarouselPaused }
                  : false,
              },
            }),
      ),
      Match.exhaustive,
    ),
  )
