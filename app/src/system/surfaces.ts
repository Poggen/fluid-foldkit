import { SurfaceStageBlock, layer as SurfaceStageLayer } from './surface-stage'
// Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { Button } from '@foldkit-visuals/fluid/button'
import { Elevated } from '@foldkit-visuals/fluid/elevated'
import {
  createPresentationContext,
  resolvePresentation,
  type PresentationContext,
} from '@foldkit-visuals/fluid/presentation'
import { surfaceClasses, shapeMap } from '@foldkit-visuals/fluid/tokens'
import {
  SliderBlock,
  createSliderMotionScope,
  layer as SliderLayer,
} from '@foldkit-visuals/fluid/slider'
import {
  SelectBlock,
  layer as SelectLayer,
  hoverModeOf as selectHoverModeOf,
} from '@foldkit-visuals/fluid/select'
import { InputBlock, layer as InputLayer } from '@foldkit-visuals/fluid/input'
import {
  DialogBlock,
  DialogLayer,
  DialogTitle,
  DialogDescription,
} from '@foldkit-visuals/fluid/dialog'
import {
  ColorPickerBlock,
  layer as ColorLayer,
  settingsOf,
  hoverModeOf as colorHoverModeOf,
} from '@foldkit-visuals/fluid/color-picker'
import { ComponentPresentation, SettingSelection, presentation } from '../settings'
import { motion, target, highlight } from '../motion'
import { copy, example, page, section, type PageInputs } from './view'
const key = Symbol('SurfacesSystemPage')
const SurfacesSystemPageBlock = Block.make('SurfacesSystemPage', {
  key,
  InitArgs: Schema.Tuple([ComponentPresentation]),
  ChildInitContext: ComponentPresentation,
  Model: Schema.Struct({
    range: SliderBlock.Model,
    problemStage: SurfaceStageBlock.Model,
    solutionStage: SurfaceStageBlock.Model,
    role: SelectBlock.Model,
    email: InputBlock.Model,
    dialog: DialogBlock.Model,
    color: ColorPickerBlock.Model,
  }),
  Message: defineMessageUnion({ RequestedTheme: { value: Schema.Literals(['light', 'dark']) } }),
  OutMessage: defineMessageUnion({ RequestedSetting: { selection: SettingSelection } }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SurfaceStageBlock>['programRequirements']
    | Block.FactsOf<typeof SelectBlock>['programRequirements']
    | Block.FactsOf<typeof InputBlock>['programRequirements']
    | Block.FactsOf<typeof DialogBlock>['programRequirements']
    | Block.FactsOf<typeof ColorPickerBlock>['programRequirements']
  >(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<PageInputs>() },
})
export { SurfacesSystemPageBlock as SurfacesPageBlock }
const ProblemStage = SurfacesSystemPageBlock.makeRequiredFieldBinding(SurfaceStageBlock, {
  field: 'problemStage',
  init: { contextToArgs: (settings) => [true, settings] },
})
const SolutionStage = SurfacesSystemPageBlock.makeRequiredFieldBinding(SurfaceStageBlock, {
  field: 'solutionStage',
  init: { contextToArgs: (settings) => [false, settings] },
})
const RawRange = SurfacesSystemPageBlock.makeRequiredFieldBinding(SliderBlock, {
  field: 'range',
  init: {
    contextToArgs: () => [{ id: 'system-surface-range', value: [1, 4], min: 1, max: 8, step: 1 }],
  },
})
const Range = RawRange.withOutMessagePolicy({
  fold: SurfacesSystemPageBlock.makeOutMessageFold(SliderBlock, {
    Changed: ({ value }) =>
      SurfacesSystemPageBlock.makeStep((model) =>
        RawRange.requestSettings({ settings: { ...model.range.settings, value } }),
      ),
  }),
})
const roles = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Administrator' },
  { value: 'guest', label: 'Guest' },
]
const RawRole = SurfacesSystemPageBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'role',
  init: {
    contextToArgs: (settings) => [
      {
        id: 'system-surface-role',
        parentId: 'system-invite-dialog',
        items: roles,
        defaultValue: 'member',
        hoverMode: settings.hover,
      },
    ],
  },
})
const Role = RawRole.withOutMessagePolicy({
  fold: SurfacesSystemPageBlock.makeOutMessageFold(SelectBlock, {
    OpenChanged: SurfacesSystemPageBlock.makeNoopStep,
    Selected: ({ value }) => RawRole.requestConfigure({ items: roles, value, disabled: false }),
  }),
})
const RawEmail = SurfacesSystemPageBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'email',
  init: { contextToArgs: () => [{ id: 'system-invite-email', value: '' }] },
})
const Email = RawEmail.withOutMessagePolicy({
  fold: SurfacesSystemPageBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: SurfacesSystemPageBlock.makeNoopStep,
    Changed: ({ value }) => RawEmail.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})
const Dialog = SurfacesSystemPageBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => [{ id: 'system-invite-dialog' }] },
}).withOutMessagePolicy({
  fold: SurfacesSystemPageBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: SurfacesSystemPageBlock.makeNoopStep,
    CompletedClose: SurfacesSystemPageBlock.makeNoopStep,
  }),
})
const RawColor = SurfacesSystemPageBlock.makeRequiredFieldBinding(ColorPickerBlock, {
  field: 'color',
  init: {
    contextToArgs: (settings) => [
      { id: 'system-surface-color', defaultValue: '#6B97FF', hoverMode: settings.hover },
    ],
  },
})
const Color = RawColor.withOutMessagePolicy({
  fold: SurfacesSystemPageBlock.makeOutMessageFold(ColorPickerBlock, {
    Events: ({ events }) =>
      SurfacesSystemPageBlock.makeStep((model) => {
        const value = events.findLast((event) => event.type === 'value')
        return value === undefined
          ? { model }
          : RawColor.requestConfigure({
              settings: { ...settingsOf(model.color), value: Option.some(value.value) },
            })
      }),
  }),
})
const SurfacesSystemPageComposition = SurfacesSystemPageBlock.makeComposition({
  bindings: [Range, Role, Email, Dialog, Color, ProblemStage, SolutionStage],
})
export const layer = Layer.unwrap(
  Effect.sync(() => {
    const sliderMotion = createSliderMotionScope('system-surfaces-slider')
    const implementation = {
      init: SurfacesSystemPageComposition.makeInit((settings) => ({
        model: {},
        childInitContext: settings,
      })),
      update: SurfacesSystemPageComposition.makeUpdate({
        RequestedTheme: SurfacesSystemPageBlock.makeOutMessageStep.fromMessage(({ value }) =>
          SurfacesSystemPageBlock.OutMessage.RequestedSetting({
            selection: { _tag: 'Theme', value },
          }),
        ),
      }),
      inMessageUpdate: SurfacesSystemPageComposition.makeInMessageUpdate({
        InformedOfPresentation: SurfacesSystemPageBlock.makeStep((model, { presentation }) =>
          Update.combineSteps([
            ProblemStage.informOfPresentation({ presentation }),
            SolutionStage.informOfPresentation({ presentation }),
            ...(selectHoverModeOf(model.role) === presentation.hover
              ? []
              : [Role.requestHoverMode({ mode: presentation.hover })]),
            ...(colorHoverModeOf(model.color) === presentation.hover
              ? []
              : [Color.requestHoverMode({ mode: presentation.hover })]),
          ]),
        ),
      }),
      view: SurfacesSystemPageComposition.makeView.withInputs((model, { settings }, h) => {
        const context = presentation(settings)
        const shape = shapeMap[settings.shape]
        const bounds =
          typeof model.range.settings.value === 'number'
            ? [1, model.range.settings.value]
            : model.range.settings.value
        const low = bounds[0] ?? 1,
          high = bounds[1] ?? 4
        const panelShape = { rounded: 'rounded-2xl', pill: 'rounded-3xl', sharp: 'rounded-[1px]' }[
          settings.shape
        ]
        const nested = (
          level: number,
          last: number,
          parent: PresentationContext,
          first = true,
        ): ReturnType<typeof h.div> =>
          Elevated(
            {
              context: parent,
              offset: first ? 0 : 1,
              className: `relative p-6 flex items-center justify-center [&:hover>span]:opacity-100 [&:has([data-surface]:hover)>span]:opacity-0 ${panelShape} ${level === last ? 'size-24' : ''}`,
              children: (next) => [
                h.span(
                  [
                    h.Class(
                      'absolute top-2 left-2.5 text-site-caption text-muted-foreground opacity-0 transition-opacity duration-150',
                    ),
                  ],
                  [`Surface ${level}`],
                ),
                ...(level < last ? [nested(level + 1, last, next, false)] : []),
              ],
            },
            h,
          )
        const levels = () =>
          h.div(
            [h.Class('flex gap-3 p-4 w-max')],
            Array.from({ length: 8 }, (_, index) =>
              h.div(
                [h.Class('flex flex-col items-center gap-2 shrink-0')],
                [
                  h.div(
                    [
                      h.Class(
                        `w-14 h-14 ${resolvePresentation({ context }).shape.container} ${surfaceClasses(index + 1, index + 1)}`,
                      ),
                    ],
                    [h.strong([], [String(index + 1)])],
                  ),
                  h.span(
                    [h.Class('text-[11px] leading-3.5 text-muted-foreground font-mono')],
                    [`Surface ${index + 1}`],
                  ),
                ],
              ),
            ),
          )
        return page(
          h,
          'surfaces',
          settings,
          [
            h.div(
              [
                h.Class(
                  '[.system-docs_&]:flex [.system-docs_&]:flex-wrap [.system-docs_&]:items-center [.system-docs_&]:gap-3 [.system-docs_&]:my-4 ',
                ),
              ],
              (['light', 'dark'] as const).map((value) =>
                Button(
                  {
                    context,
                    variant: 'secondary',
                    children: [`${value} mode`],
                    attributes: [
                      h.AriaPressed(String(settings.theme === value)),
                      h.OnClick(SurfacesSystemPageBlock.Message.RequestedTheme({ value })),
                    ],
                  },
                  h,
                ),
              ),
            ),
            section(h, 'The problem', [
              ...copy(h, 'surfaces', 'The problem'),
              example(
                h,
                'Fixed backgrounds lose hierarchy',
                [
                  h.block(
                    ProblemStage.embedView({
                      slotId: 'surface-problem-stage',
                      model: model.problemStage,
                      viewInputs: { settings },
                    }),
                  ),
                ],
                settings,
              ),
            ]),
            section(h, 'The solution', [
              h.p([], ['Three pieces: tokens, substrate context, and the primitive.']),
              h.h3([h.Class('text-site-title text-foreground leading-none')], ['Tokens']),
              h.p(
                [],
                [
                  'Eight background and shadow pairs. Light mode flattens to white after step 2; shadow carries elevation. Dark mode keeps adding lightness and a layered shadow.',
                ],
              ),
              levels(),
              h.h3([h.Class('text-site-title text-foreground leading-none')], ['Substrate']),
              h.p(
                [],
                [
                  'Each container knows its own level and tells whatever opens inside. A popover on the page and the same popover inside a dialog both end up at the right depth.',
                ],
              ),
              example(
                h,
                'Nested surface context',
                [nested(1, 4, createPresentationContext({ context, surface: 1 }))],
                settings,
              ),
              h.h3([h.Class('text-site-title text-foreground leading-none')], ['Elevated']),
              h.p(
                [],
                [
                  'Wrap a panel and the background settles at the level it belongs to. The shadow does not change, so a popover still reads as a popover three layers down.',
                ],
              ),
              Elevated(
                {
                  context,
                  offset: 2,
                  className: `p-6 ${panelShape}`,
                  children: () => [h.p([], ['A panel two levels above its surrounding surface.'])],
                },
                h,
              ),
              h.h3(
                [h.Class('text-site-title text-foreground leading-none')],
                ['Move through levels'],
              ),
              h.p(
                [],
                [
                  'Drag both knobs to choose which slice of the ladder to nest. Each layer lifts a single step off the one it sits in.',
                ],
              ),
              h.block(
                Range.embedView({
                  slotId: model.range.id,
                  model: model.range,
                  viewInputs: {
                    context,
                    label: 'Surface levels',
                    animate: motion.node,
                    motionValues: sliderMotion.node,
                  },
                }),
              ),
              h.output(
                [
                  h.Class(
                    '[.system-docs_&]:block [.system-docs_&]:my-4 [.system-docs_&]:text-muted-foreground [.system-docs_&]:tabular-nums',
                  ),
                ],
                [`Levels ${low} to ${high}`],
              ),
              nested(low, high, createPresentationContext({ context, surface: low })),
            ]),
            section(h, 'Examples', [
              h.h3(
                [h.Class('text-site-title text-foreground leading-none')],
                ['A menu inside a dialog'],
              ),
              h.p(
                [],
                [
                  'The same role menu now inherits the dialog substrate. Select a role, edit the email and compare the annotated dark backgrounds.',
                ],
              ),
              example(
                h,
                'Inherited backgrounds preserve hierarchy',
                [
                  h.block(
                    SolutionStage.embedView({
                      slotId: 'surface-solution-stage',
                      model: model.solutionStage,
                      viewInputs: { settings },
                    }),
                  ),
                ],
                settings,
              ),
              h.h3([h.Class('text-site-title text-foreground leading-none')], ['Invite dialog']),
              h.p(
                [],
                [
                  'The dialog and its role picker carry the same native presentation context across the portal.',
                ],
              ),
              h.block(
                Dialog.embedView({
                  slotId: model.dialog.id,
                  model: model.dialog,
                  viewInputs: {
                    context,
                    surface: 1,
                    animate: motion.node,
                    trigger: (attributes) =>
                      Button({ context, children: ['Invite to your workspace'], attributes }, h),
                    content: (info) => {
                      const next = info.presentation.context
                      return [
                        DialogTitle(
                          {
                            context: next,
                            dialogId: info.id,
                            children: ['Invite to your workspace'],
                          },
                          h,
                        ),
                        DialogDescription(
                          {
                            context: next,
                            dialogId: info.id,
                            children: ['Choose an email and a role.'],
                          },
                          h,
                        ),
                        h.block(
                          Email.embedView({
                            slotId: model.email.id,
                            model: model.email,
                            viewInputs: {
                              context: info.presentation.context,
                              placeholder: 'name@example.com',
                              attributes: childAttributes([h.AriaLabel('Email address')]),
                            },
                          }),
                        ),
                        h.block(
                          Role.embedView({
                            slotId: model.role.id,
                            model: model.role,
                            viewInputs: {
                              context: next,
                              animate: target.node,
                              placeholder: 'Choose a role',
                              ariaLabel: 'Workspace role',
                            },
                          }),
                        ),
                        Button({ context: next, children: ['Done'], attributes: info.close }, h),
                      ]
                    },
                  },
                }),
              ),
              h.h3([h.Class('text-site-title text-foreground leading-none')], ['Color picker']),
              h.p([], ['The format dropdown sits one level above the picker panel.']),
              Elevated(
                {
                  context,
                  offset: 2,
                  className: 'relative w-full max-w-[320px] p-6 flex flex-col gap-5',
                  children: (next) => [
                    h.block(
                      Color.embedView({
                        slotId: model.color.color.id,
                        model: model.color,
                        viewInputs: {
                          context: next,
                          animate: motion.node,
                          sliderMotion: sliderMotion.node,
                          highlightMotion: highlight,
                        },
                      }),
                    ),
                  ],
                },
                h,
              ),
            ]),
          ],

          {
            '--system-panel-radius': `${shape.variant === 'sharp' ? 1 : Math.max(16, shape.containerRadius)}px`,
            '--system-field-radius': `${shape.variant === 'sharp' ? 1 : Math.max(12, shape.bgRadius)}px`,
            '--system-swatch-radius': `${shape.containerRadius}px`,
            '--system-swatch-panel-radius': `${shape.variant === 'sharp' ? 1 : shape.containerRadius + 16}px`,
          },
        )
      }),
    }
    return SurfacesSystemPageBlock.makeLayer<typeof implementation>(implementation).pipe(
      Layer.provide(
        Layer.mergeAll(
          SurfaceStageLayer,
          SliderLayer,
          SelectLayer,
          InputLayer,
          DialogLayer,
          ColorLayer,
          sliderMotion.layer,
        ),
      ),
    )
  }),
)
