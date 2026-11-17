import { spring } from '@foldkit-visuals/fluid/tokens'
import { Match } from 'effect'
import { createKeyedLazy, childAttributes } from 'foldkit/html'
import type { FluidConfiguration } from '../../playground/configuration'
import type { ResolvedSettings } from '../../settings'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { configuredContext } from './configuration-presentation'
import { TabsItem } from '@foldkit-visuals/fluid/tabs'
import { RadioItem } from '@foldkit-visuals/fluid/radio-group'
import { CheckboxItem } from '@foldkit-visuals/fluid/checkbox-group'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'
import { motion, target, highlight } from '../../motion'
import { Carousel, Tabs, Slider, sliderMotion } from './core-bindings'
import { Radio, Checks, Steps, Profile, Portfolio, Recent, Analysis } from './details-bindings'
import type { FluidGalleryBlock } from './block'

const renderTabs = (
  tabs: FluidGalleryModel['tabs'],
  c: Extract<FluidConfiguration, { readonly _tag: 'tabs' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  const labels = Array.from(
    { length: c.count },
    (_, i) => c.labels.split(',')[i]?.trim() || `Tab ${i + 1}`,
  )
  return h.block(
    Tabs.embedView({
      slotId: 'tabs',
      model: tabs,
      viewInputs: {
        context,
        animate: target.node,
        ariaLabel: 'Workspace tabs',
        items: labels.map((value) => ({ value, disabled: c.disabled })),
        content: (tabs) =>
          labels.map((label, index) =>
            TabsItem(
              {
                index,
                label,
                ...(c.showIcons
                  ? {
                      icon:
                        index % 3 === 0
                          ? defaultIcons.home
                          : index % 3 === 1
                            ? defaultIcons['message-circle']
                            : defaultIcons.inbox,
                    }
                  : {}),
              },
              tabs,
              h,
            ),
          ),
      },
    }),
  )
}
const renderSlider = (
  slider: FluidGalleryModel['slider'],
  c: Extract<FluidConfiguration, { readonly _tag: 'slider' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  return h.block(
    Slider.embedView({
      slotId: 'slider',
      model: slider,
      viewInputs: {
        context,
        label: c.label,
        animate: motion.node,
        motionValues: sliderMotion.node,
      },
    }),
  )
}
const renderRadioGroup = (
  radio: FluidGalleryModel['radio'],
  c: Extract<FluidConfiguration, { readonly _tag: 'radio-group' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, undefined)
  const labels = Array.from(
    { length: c.count },
    (_, i) => c.labels.split(',')[i]?.trim() || `Option ${i + 1}`,
  )
  return h.block(
    Radio.embedView({
      slotId: 'radio',
      model: radio,
      viewInputs: {
        context,
        animate: target.node,
        animateHighlight: highlight,
        content: (group) => labels.map((label, index) => RadioItem({ index, label }, group, h)),
      },
    }),
  )
}
const renderCheckboxGroup = (
  checks: FluidGalleryModel['checks'],
  c: Extract<FluidConfiguration, { readonly _tag: 'checkbox-group' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, undefined)
  const labels = Array.from(
    { length: c.count },
    (_, i) => c.labels.split(',')[i]?.trim() || `Option ${i + 1}`,
  )
  return h.block(
    Checks.embedView({
      slotId: 'checks',
      model: checks,
      viewInputs: {
        context,
        animate: target.node,
        animateHighlight: highlight,
        animateSelection: selectionBackgroundAnimation(target),
        content: (group) => labels.map((label, index) => CheckboxItem({ index, label }, group, h)),
      },
    }),
  )
}
const renderThinkingSteps = (
  steps: FluidGalleryModel['steps'],
  profile: FluidGalleryModel['profile'],
  portfolio: FluidGalleryModel['portfolio'],
  recent: FluidGalleryModel['recent'],
  analysis: FluidGalleryModel['analysis'],
  c: Extract<FluidConfiguration, { readonly _tag: 'thinking-steps' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  return h.block(
    Steps.embedView({
      slotId: 'steps',
      model: steps,
      viewInputs: {
        context,
        animate: target.node,
        label: () => c.label,
        ...(c.meta === '' ? {} : { meta: () => c.meta }),
        content: () => [
          h.block(
            Profile.embedView({
              slotId: 'profile',
              model: profile,
              viewInputs: {
                context,
                animate: target.node,
                label: c.stepLabel,
                description: c.stepDescription,
                ...(c.stepMeta === '' ? {} : { meta: () => c.stepMeta }),
                href: c.href,
                showIcon: c.showIcons,
                icon: 'search',
                isLast: c.count === 1,
              },
            }),
          ),
          ...(c.count > 1
            ? [
                h.block(
                  Portfolio.embedView({
                    slotId: 'portfolio',
                    model: portfolio,
                    viewInputs: {
                      context,
                      animate: target.node,
                      label: 'Reading portfolio',
                      showIcon: c.showIcons,
                      icon: 'globe',
                      isLast: c.count === 2,
                    },
                  }),
                ),
              ]
            : []),
          ...(c.count > 2
            ? [
                h.block(
                  Recent.embedView({
                    slotId: 'recent',
                    model: recent,
                    viewInputs: {
                      context,
                      animate: target.node,
                      label: 'Searching recent work',
                      showIcon: c.showIcons,
                      icon: 'search',
                      isLast: c.count === 3,
                    },
                  }),
                ),
              ]
            : []),
          ...(c.count > 3
            ? [
                h.block(
                  Analysis.embedView({
                    slotId: 'analysis',
                    model: analysis,
                    viewInputs: {
                      context,
                      animate: target.node,
                      label: 'Analyzing results',
                      showIcon: c.showIcons,
                      icon: 'brain',
                      isLast: true,
                    },
                  }),
                ),
              ]
            : []),
        ],
      },
    }),
  )
}
type Events = Pick<typeof FluidGalleryBlock.Message, 'HoveredCarousel' | 'PickedCarousel'>
const renderCarouselDots = (
  events: Events,
  carousel: FluidGalleryModel['carousel'],
  carouselDirection: FluidGalleryModel['carouselDirection'],
  c: Extract<FluidConfiguration, { readonly _tag: 'carousel-dots' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance)
  return h.div(
    [h.Class('flex flex-col items-center gap-3')],
    [
      h.div(
        [
          h.Class(
            'grid h-16 w-48 place-items-center overflow-hidden rounded-xl border border-border/60 bg-background',
          ),
          h.OnMouseEnter(events.HoveredCarousel({ paused: true })),
          h.OnMouseLeave(events.HoveredCarousel({ paused: false })),
        ],
        Array.from({ length: c.count }, (_, index) => `${c.labelPrefix} ${index + 1}`).map(
          (label, index) =>
            motion.node(
              h.span([h.Class('absolute '), h.AriaHidden(index !== carousel.clock.value)], [label]),
              {
                present: index === carousel.clock.value,
                initial: { opacity: 0, x: carouselDirection * 24 },
                animate: { opacity: 1, x: 0 },
                exit: {
                  opacity: 0,
                  x: -carouselDirection * 24,
                  transition: spring.moderate.exit,
                },
                transition: spring.moderate,
                reducedMotion: 'user',
              },
            ),
        ),
      ),
      h.block(
        Carousel.embedView({
          slotId: 'carousel',
          model: carousel,
          viewInputs: {
            context,
            attributes: childAttributes([
              h.OnMouseDown(events.PickedCarousel()),
              h.OnKeyDown(() => events.PickedCarousel()),
            ]),
            animate: target.node,
            animateHighlight: highlight,
            getLabel: (index) => `Show ${c.labelPrefix} ${index + 1}`,
          },
        }),
      ),
    ],
  )
}

export const makeSimpleStateView = (events: Events) => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    configuration: Extract<
      FluidConfiguration,
      {
        readonly _tag:
          | 'tabs'
          | 'slider'
          | 'radio-group'
          | 'checkbox-group'
          | 'thinking-steps'
          | 'carousel-dots'
      }
    >,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    Match.value(configuration).pipe(
      Match.tag('tabs', (c) =>
        lazy('tabs', renderTabs, [model.tabs, c, settings.shape, settings.size, settings.hover, h]),
      ),
      Match.tag('slider', (c) =>
        lazy('slider', renderSlider, [
          model.slider,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('radio-group', (c) =>
        lazy('radio-group', renderRadioGroup, [
          model.radio,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('checkbox-group', (c) =>
        lazy('checkbox-group', renderCheckboxGroup, [
          model.checks,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('thinking-steps', (c) =>
        lazy('thinking-steps', renderThinkingSteps, [
          model.steps,
          model.profile,
          model.portfolio,
          model.recent,
          model.analysis,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('carousel-dots', (c) =>
        lazy('carousel-dots', renderCarouselDots, [
          events,
          model.carousel,
          model.carouselDirection,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.exhaustive,
    )
}
