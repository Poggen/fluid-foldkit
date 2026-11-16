import type { CoreEvents } from './render-presentation'
import { AccordionContent, AccordionItem, AccordionTrigger } from '@foldkit-visuals/fluid/accordion'
import { Field, FieldLabel } from '@foldkit-visuals/fluid/field'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { TabsItem } from '@foldkit-visuals/fluid/tabs'
import { thinkingIndicatorAnimations } from '@foldkit-visuals/fluid/thinking-indicator'
import { spring } from '@foldkit-visuals/fluid/tokens'
import { childAttributes } from 'foldkit/html'
import { highlight, motion, target } from '../../motion'
import type { FluidViewBuilder } from './composition'
import {
  Accordion,
  Carousel,
  Checkbox,
  Input,
  Select,
  Slider,
  Sound,
  Switch,
  Tabs,
  Textarea,
  Thinking,
  Volume,
  sliderMotion,
  switchMotion,
} from './core-bindings'
import { ACCORDION_ITEMS } from './demo-data'

import type { FluidGalleryInputs, FluidGalleryModel } from './block'

import { demoPresentation } from './render-presentation'

export const renderInput = (
  input: FluidGalleryModel['input'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Input.embedView({
      slotId: 'input',
      model: input,
      viewInputs: {
        context,
        type: 'text',
        placeholder: 'Your next idea',
        attributes: [],
      },
    }),
  )
}

export const renderTextarea = (
  textarea: FluidGalleryModel['textarea'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Textarea.embedView({
      slotId: 'textarea',
      model: textarea,
      viewInputs: {
        context,
        placeholder: 'Leave a little room for a longer thought…',
      },
    }),
  )
}

export const renderCheckbox = (
  checkbox: FluidGalleryModel['checkbox'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  const common = { context, animate: target.node }
  return h.div(
    [h.Class('flex flex-col gap-4 w-full max-w-[330px] mx-auto ')],
    [
      Field(
        {
          context,
          orientation: 'horizontal',
          className: 'w-auto',
          children: [
            h.block(
              Checkbox.embedView({
                slotId: 'checkbox',
                model: checkbox,
                viewInputs: { ...common, label: 'A little attention to detail' },
              }),
            ),
            FieldLabel(
              {
                context,
                htmlFor: checkbox.id,
                children: ['A little attention to detail'],
              },
              h,
            ),
          ],
        },
        h,
      ),
    ],
  )
}

export const renderSwitch = (
  switchModel: FluidGalleryModel['switch'],
  sound: FluidGalleryModel['sound'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.div(
    [h.Class('flex flex-col gap-3')],
    [
      h.block(
        Switch.embedView({
          slotId: 'switch',
          model: switchModel,
          viewInputs: {
            context,
            label: 'Notifications',
            animate: switchMotion.node,
          },
        }),
      ),
      h.block(
        Sound.embedView({
          slotId: 'sound',
          model: sound,
          viewInputs: { context, label: 'Sound effects', animate: switchMotion.node },
        }),
      ),
    ],
  )
}

export const renderSelect = (
  select: FluidGalleryModel['select'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.div(
    [h.Class('w-full max-w-[280px]')],
    [
      h.block(
        Select.embedView({
          slotId: 'select',
          model: select,
          viewInputs: {
            context,
            animate: target.node,
            ariaLabel: 'Role',
            placeholder: 'Choose a role',
            variant: 'bordered',
            className: 'w-full',
          },
        }),
      ),
    ],
  )
}

export const renderTabs = (
  tabs: FluidGalleryModel['tabs'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  const common = { context, animate: target.node }
  return h.block(
    Tabs.embedView({
      slotId: 'tabs',
      model: tabs,
      viewInputs: {
        ...common,
        ariaLabel: 'Workspace tabs',
        items: ['Home', 'Chat', 'Inbox'].map((value) => ({
          value,
          disabled: false,
        })),
        content: (tabs) =>
          ['Home', 'Chat', 'Inbox'].map((label, index) =>
            TabsItem(
              {
                index,
                label,
                icon:
                  index === 0
                    ? defaultIcons.home
                    : index === 1
                      ? defaultIcons['message-circle']
                      : defaultIcons.inbox,
              },
              tabs,
              h,
            ),
          ),
      },
    }),
  )
}

export const renderAccordion = (
  accordion: FluidGalleryModel['accordion'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  only: FluidGalleryInputs['only'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Accordion.embedView({
      slotId: 'accordion',
      model: accordion,
      viewInputs: {
        context,
        animate: motion.node,
        animateHighlight: highlight,
        content: (accordion) =>
          (only === undefined ? ACCORDION_ITEMS : ACCORDION_ITEMS.slice(0, 4)).map(
            ({ value, title, content: description }, index) =>
              AccordionItem(
                {
                  value: value ?? '',
                  index,
                  children: (item) => [
                    AccordionTrigger({ value: value ?? '', children: [title ?? ''] }, item, h),
                    AccordionContent(
                      { value: value ?? '', children: [description ?? ''] },
                      item,
                      h,
                    ),
                  ],
                },
                accordion,
                h,
              ),
          ),
      },
    }),
  )
}

export const renderThinkingIndicator = (
  thinking: FluidGalleryModel['thinking'],
  globalSize: FluidGalleryInputs['settings']['size'],
  h: FluidViewBuilder,
) => {
  return h.block(
    Thinking.embedView({
      slotId: 'thinking',
      model: thinking,
      viewInputs: {
        size: globalSize,
        ...thinkingIndicatorAnimations(target),
      },
    }),
  )
}

export const renderSlider = (
  slider: FluidGalleryModel['slider'],
  volume: FluidGalleryModel['volume'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.div(
    [h.Class('flex flex-col gap-8 w-full max-w-[280px]')],
    [
      h.div(
        [],
        [
          h.div(
            [h.Class('flex items-center justify-between text-site-body')],
            [h.span([], ['Opacity']), h.span([], [String(slider.settings.value)])],
          ),
          h.block(
            Slider.embedView({
              slotId: 'slider',
              model: slider,
              viewInputs: {
                context,
                label: 'Opacity',
                animate: motion.node,
                motionValues: sliderMotion.node,
              },
            }),
          ),
        ],
      ),
      h.block(
        Volume.embedView({
          slotId: 'volume',
          model: volume,
          viewInputs: {
            context,
            label: 'Volume',
            formatValue: (value) => `${value}%`,
            animate: motion.node,
            motionValues: sliderMotion.node,
          },
        }),
      ),
    ],
  )
}

export const renderCarouselDots = (
  carousel: FluidGalleryModel['carousel'],
  carouselDirection: FluidGalleryModel['carouselDirection'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
  events: CoreEvents,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.div(
    [h.Class('flex flex-col items-center gap-3')],
    [
      h.div(
        [
          h.Class(
            'grid h-16 w-48 place-items-center overflow-hidden rounded-xl border border-border/60 bg-background',
          ),
          h.OnMouseEnter(events.hovered({ paused: true })),
          h.OnMouseLeave(events.hovered({ paused: false })),
        ],
        Array.from(
          { length: 4 },
          (_, index) => ['Inbox', 'Drafts', 'Sent', 'Archive'][index] ?? `Slide ${index + 1}`,
        ).map((label, index) =>
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
              h.OnMouseDown(events.pick()),
              h.OnKeyDown(() => events.pick()),
            ]),
            animate: target.node,
            animateHighlight: highlight,
            getLabel: (index) =>
              `Show ${['Inbox', 'Drafts', 'Sent', 'Archive'][index] ?? `slide ${index + 1}`}`,
          },
        }),
      ),
    ],
  )
}
