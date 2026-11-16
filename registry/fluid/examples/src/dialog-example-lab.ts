import { Input, Button as UiButton } from '@foldkit/ui'
import type { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import {
  DialogTrigger,
  DialogClose,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@foldkit-visuals/fluid/dialog'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { Button } from '@foldkit-visuals/fluid/button'
import {
  DialogExampleBlock,
  DialogExampleComposition,
  Message,
  Lab,
  motion,
} from './dialog-example-block.js'
import {
  hookPolicies,
  slotForms,
  labToggles,
  labToggleFields,
} from './dialog-example-lab-options.js'

export function dialogLabView(
  model: typeof DialogExampleBlock.Model.Type,
  h: Block.ViewBuilderFor<typeof DialogExampleComposition>,
) {
  const context = createPresentationContext({
    reducedMotion: 'user',
    size: model.isLabCompact ? 'compact' : 'default',
    shape: model.isLabPill ? 'pill' : 'rounded',
    surface: model.isLabSurface ? 3 : 1,
  })
  const button = (
    label: string,
    attributes: Parameters<typeof h.button>[0] = [],
    disabled = false,
  ) => Button({ context, variant: 'secondary', children: [label], attributes, disabled }, h)
  const ownerControls = () =>
    h.div(
      [h.Class('flex flex-wrap gap-3 items-center')],
      [
        button(model.isLabControlled ? 'Release control' : 'Take control', [
          h.OnClick(Message.ClickedLabOwnership()),
        ]),
        button(
          'Owner opens',
          [h.OnClick(Message.ClickedLabOwnerOpen({ open: true }))],
          !model.isLabControlled,
        ),
        button(
          'Owner closes',
          [h.OnClick(Message.ClickedLabOwnerOpen({ open: false }))],
          !model.isLabControlled,
        ),
        button(model.isLabAcceptClose ? 'Ignore lab close' : 'Accept lab close', [
          h.OnClick(Message.ClickedLabToggle({ field: 'labAcceptClose' })),
        ]),
        button(model.isLabModal ? 'Make nonmodal' : 'Make modal', [
          h.OnClick(Message.ClickedLabModal()),
        ]),
      ],
    )
  return h.section(
    [h.Id('dialog-contract-lab')],
    [
      h.h2([], ['Dialog contracts']),
      h.p(
        [],
        [
          'Public options, ownership transitions and real lifecycle policies. Ref policy reports actual acquisition/release to the console.',
        ],
      ),
      ownerControls(),
      h.div(
        [h.Class('flex flex-wrap gap-3 items-center')],
        [
          ...labToggles
            .filter(([field]) => field !== 'labAcceptClose')
            .map(([field, label]) =>
              button(`${label}: ${model[labToggleFields[field]] ? 'on' : 'off'}`, [
                h.OnClick(Message.ClickedLabToggle({ field })),
              ]),
            ),
          button(model.isLabDark ? 'Theme: dark' : 'Theme: light', [
            h.OnClick(Message.ClickedLabTheme()),
          ]),
          ...(['sm', 'lg', 'xl'] as const).map((size) =>
            button(`Width: ${size}`, [h.OnClick(Message.ClickedLabSize({ size }))]),
          ),
        ],
      ),
      h.div(
        [h.Class('flex flex-wrap gap-3 items-center')],
        slotForms.map((slot) =>
          button(`Slot: ${slot}${model.labSlot === slot ? ' ✓' : ''}`, [
            h.OnClick(Message.ClickedLabSlot({ slot })),
          ]),
        ),
      ),
      h.div(
        [h.Class('flex flex-wrap gap-3 items-center')],
        hookPolicies
          .filter((policy) => policy === 'none' || policy === 'ref')
          .map((policy) =>
            button(`Hook: ${policy}${model.labHook === policy ? ' ✓' : ''}`, [
              h.OnClick(Message.ClickedLabHook({ policy })),
            ]),
          ),
      ),
      h.output(
        [h.Id('lab-events')],
        [
          `Changes: ${model.labChanges.map((open) => (open ? 'open' : 'close')).join(', ')}; forwarded key: ${model.labKey}`,
        ],
      ),
      h.block(
        Lab.embedView({
          slotId: 'lab',
          model: model.lab,
          viewInputs: {
            animate: motion.node,
            context,
            callbacksId: model.labHook,
            size: model.labSize,
            position: model.isLabTop ? 'top' : 'center',
            showCloseButton: model.isLabShowClose,
            hasDescription: model.isLabDescription,
            contentClassName: 'caller-lab-content',
            contentAttributes: childAttributes([
              h.DataAttribute('caller-content', 'lab'),
              h.OnKeyDown((key) => Message.PressedLabKey({ key })),
            ]),
            trigger: (attributes) =>
              DialogTrigger(
                {
                  children: ['Open contract dialog'],
                  attributes: [
                    ...attributes,
                    h.Disabled(model.isLabDisabled),
                    h.DataAttribute('caller-slot', model.labSlot),
                  ],
                  ...(model.labSlot === 'plain'
                    ? {}
                    : {
                        render: (
                          slotAttributes: Parameters<typeof h.button>[0],
                          children: ReadonlyArray<Html | string>,
                        ) =>
                          Button(
                            {
                              context,
                              variant: 'secondary',
                              attributes: slotAttributes,
                              children,
                              disabled: model.isLabDisabled,
                            },
                            h,
                          ),
                      }),
                },
                h,
              ),
            content: (dialog) => [
              DialogHeader(
                {
                  className: 'caller-lab-header',
                  attributes: [h.DataAttribute('caller-header', 'lab')],
                  children: [
                    DialogTitle(
                      {
                        ...dialog.presentation,
                        dialogId: dialog.id,
                        className: 'caller-lab-title',
                        children: ['Contract dialog'],
                      },
                      h,
                    ),
                    ...(model.isLabDescription
                      ? [
                          DialogDescription(
                            {
                              ...dialog.presentation,
                              dialogId: dialog.id,
                              children: [
                                'Try the caller controls while open; Escape and outside behavior follow the selected policy.',
                              ],
                            },
                            h,
                          ),
                        ]
                      : []),
                  ],
                },
                h,
              ),
              Input.view(
                {
                  id: 'dialog-lab-first-focus',
                  placeholder: 'First focus',
                  toView: (attributes) =>
                    h.input([
                      ...attributes.input,
                      ...dialog.initialFocus,
                      h.AriaLabel('Lab first focus'),
                      h.Class(
                        'block w-full [border:1px_solid] rounded-[6px] p-[8px_12px] bg-transparent mt-4',
                      ),
                    ]),
                },
                h,
              ),
              UiButton.view(
                {
                  type: 'button',
                  toView: (attributes) =>
                    h.button(
                      [...attributes.button, h.Id('lab-secondary-focus')],
                      ['Secondary focus'],
                    ),
                },
                h,
              ),
              ownerControls(),
              DialogFooter(
                {
                  className: 'caller-lab-footer',
                  children: [
                    DialogClose(
                      {
                        attributes: [
                          ...dialog.close,
                          h.DataAttribute('caller-close', model.labSlot),
                        ],
                        children: ['Close contract dialog'],
                        ...(model.labSlot === 'plain'
                          ? {}
                          : {
                              render: (
                                attributes: Parameters<typeof h.button>[0],
                                children: ReadonlyArray<Html | string>,
                              ) =>
                                Button(
                                  {
                                    ...dialog.presentation,
                                    variant: 'ghost',
                                    attributes,
                                    children,
                                  },
                                  h,
                                ),
                            }),
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ],
          },
        }),
      ),
      Input.view(
        {
          id: 'dialog-lab-outside-focus',
          placeholder: 'Nonmodal outside focus target',
          toView: (attributes) =>
            h.input([
              ...attributes.input,
              h.AriaLabel('Lab outside focus'),
              h.Class(
                'block w-full [border:1px_solid] rounded-[6px] p-[8px_12px] bg-transparent mt-4',
              ),
            ]),
        },
        h,
      ),
    ],
  )
}
