import { Button } from '@foldkit-visuals/fluid/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@foldkit-visuals/fluid/dialog'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'

import { highlight, motion, target } from '../../motion'
import type { FluidViewBuilder } from './composition'
import { DIALOG_COPY, DROPDOWN_ITEMS } from './demo-data'
import { Ask, Dialog, Dropdown, First, Group, Last, Website } from './interactive-bindings'

import type { FluidGalleryInputs, FluidGalleryModel } from './block'

import { demoPresentation } from './render-presentation'

export const renderDialog = (
  dialog: FluidGalleryModel['dialog'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Dialog.embedView({
      slotId: 'dialog',
      model: dialog,
      viewInputs: {
        context,
        animate: motion.node,
        size: 'sm',
        position: 'center',
        showCloseButton: true,
        className: 'flex justify-center',
        trigger: (attrs) =>
          Button(
            {
              context,
              variant: 'secondary',
              children: [DIALOG_COPY.trigger],
              buttonSize: 'sm',
              attributes: attrs,
            },
            h,
          ),
        content: (dialog) => [
          DialogHeader(
            {
              context,
              children: [
                DialogTitle(
                  {
                    context,
                    dialogId: dialog.id,
                    children: [DIALOG_COPY.title],
                  },
                  h,
                ),
                DialogDescription(
                  {
                    context,
                    dialogId: dialog.id,
                    children: [DIALOG_COPY.description],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          h.div(
            [h.Class('flex justify-end gap-2 mt-6')],
            [
              Button(
                {
                  context,
                  variant: 'ghost',
                  children: [DIALOG_COPY.cancel],
                  attributes: dialog.close,
                },
                h,
              ),
              Button({ context, children: [DIALOG_COPY.confirm], attributes: dialog.close }, h),
            ],
          ),
        ],
      },
    }),
  )
}

export const renderDropdown = (
  dropdown: FluidGalleryModel['dropdown'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Dropdown.embedView({
      slotId: 'dropdown',
      model: dropdown,
      viewInputs: {
        context,
        animate: target.node,
        content: (menu) =>
          DROPDOWN_ITEMS.map(({ label, icon }, index) =>
            DropdownItem(
              {
                index,
                label,
                icon: defaultIcons[icon],
                checked:
                  dropdown.controller.checkedIndex._tag === 'Some' &&
                  dropdown.controller.checkedIndex.value === index,
                animate: target.node,
              },
              menu,
              h,
            ),
          ),
      },
    }),
  )
}

export const renderAskUserQuestions = (
  ask: FluidGalleryModel['ask'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Ask.embedView({
      slotId: 'ask',
      model: ask,
      viewInputs: {
        context,
        animate: motion.node,
        animateHighlight: highlight,
        animateSelection: selectionBackgroundAnimation(target),
      },
    }),
  )
}

export const renderInputGroup = (
  group: FluidGalleryModel['group'],
  first: FluidGalleryModel['first'],
  last: FluidGalleryModel['last'],
  website: FluidGalleryModel['website'],
  shape: FluidGalleryInputs['settings']['shape'],
  size: FluidGalleryInputs['settings']['size'],
  hover: FluidGalleryInputs['settings']['hover'],
  h: FluidViewBuilder,
) => {
  const context = demoPresentation(shape, size, hover)
  return h.block(
    Group.embedView({
      slotId: 'group',
      model: group,
      viewInputs: {
        context,
        content: (group) => [
          h.block(
            First.embedView({
              slotId: 'first',
              model: first,
              viewInputs: {
                context,
                activeIndex: group.activeIndex,
                label: 'Name',
                placeholder: 'Your name',
                icon: defaultIcons.user,
              },
            }),
          ),
          h.block(
            Last.embedView({
              slotId: 'last',
              model: last,
              viewInputs: {
                context,
                activeIndex: group.activeIndex,
                label: 'Email',
                placeholder: 'you@studio.design',
                icon: defaultIcons.mail,
              },
            }),
          ),
          h.block(
            Website.embedView({
              slotId: 'website',
              model: website,
              viewInputs: {
                context,
                activeIndex: group.activeIndex,
                label: 'Website',
                placeholder: 'studio.design',
                icon: defaultIcons.globe,
              },
            }),
          ),
        ],
      },
    }),
  )
}
