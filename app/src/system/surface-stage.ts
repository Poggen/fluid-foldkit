/* @license Adapted from Fluid Functionalism f8014098 surfaces teaching examples. MIT, copyright 2026 Micka Touillaud. */
import { Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { InputBlock, layer as InputLayer } from '@foldkit-visuals/fluid/input'
import { DropdownBlock, layer as DropdownLayer } from '@foldkit-visuals/fluid/dropdown'
import { DropdownItem } from '@foldkit-visuals/fluid/dropdown-item'
import { Button } from '@foldkit-visuals/fluid/button'
import { Elevated } from '@foldkit-visuals/fluid/elevated'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { ComponentPresentation, presentation } from '../settings'
import { motion, target } from '../motion'

const roles = [
  { label: 'Workspace owner', description: 'Can change workspace settings and invite new members' },
  { label: 'Member', description: "Can't change workspace settings or invite new members" },
  { label: 'Restricted member', description: 'Can only see and edit content they created' },
]
const key = Symbol('SurfaceStage')
export const SurfaceStageBlock = Block.make('SurfaceStage', {
  key,
  InitArgs: Schema.Tuple([Schema.Boolean, ComponentPresentation]),
  ChildInitContext: Schema.Struct({ problem: Schema.Boolean, settings: ComponentPresentation }),
  Model: Schema.Struct({
    problem: Schema.Boolean,
    roleIndex: Schema.Natural,
    sent: Schema.Boolean,
    email: InputBlock.Model,
    roles: DropdownBlock.Model,
  }),
  Message: defineMessageUnion({ Sent: {}, Cleared: {} }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof InputBlock>['programRequirements']
    | Block.FactsOf<typeof DropdownBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{ readonly settings: ComponentPresentation }>(),
  },
})
const EmailRequests = SurfaceStageBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'email',
  init: {
    contextToArgs: ({ problem }) => [
      { id: `surface-${problem ? 'problem' : 'solution'}-email`, value: '' },
    ],
  },
})
const Email = EmailRequests.withOutMessagePolicy({
  fold: SurfaceStageBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: SurfaceStageBlock.makeNoopStep,
    Changed: ({ value }) =>
      Update.combineSteps([
        EmailRequests.requestConfigure({ value, disabled: false, readOnly: false }),
        SurfaceStageBlock.makeFieldsStep(() => ({ sent: () => false })),
      ]),
  }),
})
const RolesRequests = SurfaceStageBlock.makeRequiredFieldBinding(DropdownBlock, {
  field: 'roles',
  init: {
    contextToArgs: ({ problem, settings }) => [
      {
        id: `surface-${problem ? 'problem' : 'solution'}-roles`,
        checkedIndex: 1,
        hoverMode: settings.hover,
      },
    ],
  },
})
const Roles = RolesRequests.withOutMessagePolicy({
  fold: SurfaceStageBlock.makeOutMessageFold(DropdownBlock, {
    Events: ({ events }) =>
      SurfaceStageBlock.makeStep((model) => {
        const selected = events.findLast((event) => event._tag === 'Selected')
        return selected === undefined
          ? { model }
          : Update.combineSteps([
              RolesRequests.requestSelection({
                selection: {
                  checkedIndex: Option.some(selected.index),
                  checkedIndices: Option.none(),
                },
              }),
              SurfaceStageBlock.makeFieldsStep(() => ({ roleIndex: () => selected.index })),
            ])
      }),
  }),
})
const SurfaceStageComposition = SurfaceStageBlock.makeComposition({
  bindings: [Email, Roles],
})
export const layer = SurfaceStageBlock.makeLayer({
  init: SurfaceStageComposition.makeInit((problem, settings) => ({
    model: { problem, roleIndex: 1, sent: false },
    childInitContext: { problem, settings },
  })),
  update: SurfaceStageComposition.makeUpdate({
    Sent: SurfaceStageBlock.makeFieldsStep(() => ({ sent: () => true })),
    Cleared: Update.combineSteps([
      Email.requestConfigure({ value: '', disabled: false, readOnly: false }),
      SurfaceStageBlock.makeFieldsStep(() => ({ sent: () => false })),
    ]),
  }),
  inMessageUpdate: SurfaceStageComposition.makeInMessageUpdate({
    InformedOfPresentation: SurfaceStageBlock.makeStep.fromMessage(({ presentation }) =>
      Roles.requestHoverMode({ mode: presentation.hover }),
    ),
  }),
  view: SurfaceStageComposition.makeView.withInputs((model, { settings }, h) => {
    const context = createPresentationContext({ context: presentation(settings), surface: 5 })
    const panelShape = settings.shape === 'sharp' ? 'rounded-[1px]' : 'rounded-2xl'
    const id = model.problem ? 'problem' : 'solution'
    return h.div(
      [h.Class('w-full overflow-x-auto')],
      [
        h.figure(
          [
            h.Class(
              `dark relative mx-auto w-[600px] min-h-[640px] shrink-0 bg-background ${panelShape}`,
            ),
          ],
          [
            Elevated(
              {
                context,
                offset: 0,
                className: `absolute left-1/2 -translate-x-1/2 top-8 w-[320px] p-6 flex flex-col gap-5 ${panelShape}`,
                children: (panelContext) => [
                  h.div(
                    [h.Class('flex items-center gap-3')],
                    [
                      h.div(
                        [
                          h.Class(
                            'shrink-0 w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-site-caption',
                          ),
                        ],
                        ['M'],
                      ),
                      h.h3(
                        [h.Class('text-site-title text-foreground leading-none')],
                        ['Invite to your workspace'],
                      ),
                    ],
                  ),
                  h.block(
                    Email.embedView({
                      slotId: `${id}-email`,
                      model: model.email,
                      viewInputs: {
                        context: panelContext,
                        attributes: childAttributes([h.AriaLabel('Email')]),
                        placeholder: 'email@gmail.com',
                        type: 'email',
                      },
                    }),
                  ),
                  h.div(
                    [h.Class('flex flex-col gap-2')],
                    [
                      h.p([h.Class('text-site-body text-foreground')], ['Select role']),
                      h.p(
                        [h.Class('text-site-caption text-muted-foreground')],
                        [roles[model.roleIndex]?.label ?? 'Member'],
                      ),
                      h.block(
                        Roles.embedView({
                          slotId: `${id}-roles`,
                          model: model.roles,
                          viewInputs: {
                            context: createPresentationContext({
                              context: panelContext,
                              surface: model.problem ? 3 : 5,
                            }),
                            animate: motion.node,
                            className: 'w-full',
                            contentClassName: 'w-full',
                            content: (menu) =>
                              roles.map((role, index) =>
                                DropdownItem(
                                  {
                                    index,
                                    label: role.label,
                                    checked: index === model.roleIndex,
                                    closeOnClick: false,
                                    className: 'h-auto py-2 items-start',
                                    animate: target.node,
                                    render: (attributes) =>
                                      h.div(attributes, [
                                        h.div(
                                          [
                                            h.Class(
                                              'flex flex-col gap-1 min-w-0 whitespace-normal',
                                            ),
                                          ],
                                          [
                                            h.span(
                                              [h.Class('text-site-body text-foreground')],
                                              [role.label],
                                            ),
                                            h.span(
                                              [h.Class('text-site-caption text-muted-foreground')],
                                              [role.description],
                                            ),
                                          ],
                                        ),
                                      ]),
                                  },
                                  menu,
                                  h,
                                ),
                              ),
                          },
                        }),
                      ),
                    ],
                  ),
                  h.div(
                    [h.Class('flex justify-end items-center gap-2 pt-2')],
                    [
                      Button(
                        {
                          context: panelContext,
                          variant: 'ghost',
                          children: ['Clear'],
                          attributes: [h.OnClick(SurfaceStageBlock.Message.Cleared())],
                        },
                        h,
                      ),
                      Button(
                        {
                          context: panelContext,
                          children: ['Send invites'],
                          disabled: model.email.value.trim() === '',
                          attributes: [h.OnClick(SurfaceStageBlock.Message.Sent())],
                        },
                        h,
                      ),
                    ],
                  ),
                  ...(model.sent
                    ? [
                        h.p(
                          [h.Role('status'), h.Class('text-site-caption text-muted-foreground')],
                          [`Demo invite ready for ${model.email.value}.`],
                        ),
                      ]
                    : []),
                ],
              },
              h,
            ),
            h.figcaption(
              [h.Class('absolute bottom-6 left-6 right-6 flex flex-col gap-3')],
              [
                h.div(
                  [h.Class('flex items-center gap-3 text-site-caption text-muted-foreground')],
                  [
                    h.span([h.Class('h-px w-10 bg-muted-foreground')]),
                    'Page · surface-1 · #171717',
                  ],
                ),
                h.div(
                  [h.Class('flex items-center gap-3 text-site-caption text-muted-foreground')],
                  [
                    h.span([h.Class('h-px w-10 bg-muted-foreground')]),
                    'Dialog · surface-5 · #333333',
                  ],
                ),
                h.div(
                  [
                    h.Class(
                      `flex items-center gap-3 text-site-caption ${model.problem ? 'text-destructive' : 'text-fluid-accent'}`,
                    ),
                  ],
                  [
                    h.span([
                      h.Class(`h-px w-10 ${model.problem ? 'bg-destructive' : 'bg-fluid-accent'}`),
                    ]),
                    model.problem
                      ? 'Menu · fixed surface-5 · #333333 — the same background loses hierarchy.'
                      : 'Menu · inherited surface-7 · #414141 — two levels above its dialog.',
                  ],
                ),
              ],
            ),
          ],
        ),
      ],
    )
  }),
}).pipe(Layer.provide(Layer.mergeAll(InputLayer, DropdownLayer)))
