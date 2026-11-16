import { CheckboxItem } from '@foldkit-visuals/fluid/checkbox-group'
import { Elevated } from '@foldkit-visuals/fluid/elevated'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { RadioItem } from '@foldkit-visuals/fluid/radio-group'
import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'
import { highlight, motion, target } from '../../motion'
import { commandItems } from './command-data'
import type { FluidViewBuilder } from './composition'
import { sliderMotion } from './core-bindings'
import { CHECKBOX_ITEMS, RADIO_ITEMS } from './demo-data'
import { Chat, Checks, Color, Combo, Commands, Radio, UserChat } from './details-bindings'

import type { FluidGalleryInputs, FluidGalleryModel } from './block'
import { demoPresentation } from './render-presentation'

export const renderColorPicker = (
  color: FluidGalleryModel['color'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.div(
    [h.Id('showcase-color-container'), h.Class('relative w-full max-w-[280px]')],
    [
      h.block(
        Color.embedView({
          slotId: 'color',
          model: color,
          viewInputs: {
            context,
            portalContainerId: 'showcase-color-container',
            animate: motion.node,
            sliderMotion: sliderMotion.node,
            highlightMotion: highlight,
          },
        }),
      ),
    ],
  )
}

export const renderRadioGroup = (
  radio: FluidGalleryModel['radio'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Radio.embedView({
      slotId: 'radio',
      model: radio,
      viewInputs: {
        context,
        animate: target.node,
        animateHighlight: highlight,
        content: (radio) =>
          RADIO_ITEMS.map(({ label }, index) => RadioItem({ index, label }, radio, h)),
      },
    }),
  )
}

export const renderCheckboxGroup = (
  checks: FluidGalleryModel['checks'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Checks.embedView({
      slotId: 'checks',
      model: checks,
      viewInputs: {
        context,
        animate: target.node,
        animateHighlight: highlight,
        animateSelection: selectionBackgroundAnimation(target),
        content: (checks) =>
          CHECKBOX_ITEMS.map(({ label }, index) => CheckboxItem({ index, label }, checks, h)),
      },
    }),
  )
}

export const renderCombobox = (
  combo: FluidGalleryModel['combo'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Combo.embedView({
      slotId: 'combo',
      model: combo,
      viewInputs: {
        context,
        animate: motion.node,
        placeholder: 'Add components…',
        variant: 'bordered',
        clearable: true,
        emptyText: 'No component found.',
        ariaLabel: 'Components',
      },
    }),
  )
}

export const renderChatMessage = (
  userChat: FluidGalleryModel['userChat'],
  chat: FluidGalleryModel['chat'],
  globalShape: FluidGalleryInputs['settings']['shape'],
  globalHover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const compact = demoPresentation(globalShape, 'compact', globalHover)
  return h.div(
    [h.Class('flex w-full max-w-[300px] flex-col gap-1')],
    [
      h.block(
        UserChat.embedView({
          slotId: 'user-chat',
          model: userChat,
          viewInputs: {
            context: compact,
            animate: (node, options) => target.node(node, { ...options, initial: false }),
            children: () => h.p([], ['Why is every other input box so stiff?']),
          },
        }),
      ),
      h.block(
        Chat.embedView({
          slotId: 'chat',
          model: chat,
          viewInputs: {
            context: compact,
            animate: (node, options) => target.node(node, { ...options, initial: false }),
            children: () => h.p([], ['Because nothing about them moves with you.']),
          },
        }),
      ),
    ],
  )
}

export const renderCommandMenu = (
  commands: FluidGalleryModel['commands'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return Elevated(
    {
      context,
      offset: 2,
      shadowLevel: 3,
      className: `flex max-h-[440px] w-full max-w-[520px] flex-col overflow-hidden ${resolvePresentation({ context }).shape.container}`,
      children: (surface) => [
        h.block(
          Commands.embedView({
            slotId: 'commands',
            model: commands,
            viewInputs: {
              context: surface,
              animate: motion.node,
              placeholder: 'Type a command or search...',
              className: '',
              itemIconFor: (item) =>
                defaultIcons[
                  commandItems.find((command) => command.value === item.value)?.icon ?? 'file'
                ],
            },
          }),
        ),
      ],
    },
    h,
  )
}

export { renderBreadcrumb } from './breadcrumb-view'
