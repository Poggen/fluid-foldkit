// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Data, Option, Predicate, Schema, Number } from 'effect'
import { thinkingCollapseMotion } from './thinking-collapse-motion.js'
import { Block } from 'foldkit'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import {
  Model,
  Message as ThinkingMessage,
  OutMessage,
  InMessage,
  initialize,
  changedOpen,
  toggle,
} from './thinking-collapse-state.js'
import type { ThinkingStepsConfig } from './thinking-collapse-state.js'

import * as Disclosure from '@foldkit/ui/disclosure'
import { fontWeights } from './lib/font-weight.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import type { TargetMotionOptions } from './motion-target.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Presentation, PresentationContext } from './presentation.js'

const Events =
  Data.taggedEnum<
    Extract<Attribute<typeof ThinkingMessage.Type>, { readonly _tag: 'OnCustomEvent' }>
  >()

const effects = Block.makeEffectsContract()

const contract = {
  Model,
  Message: ThinkingMessage,
  OutMessage,
  InMessage,
  effects,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      open: Schema.optionalKey(Schema.Boolean),
      defaultOpen: Schema.optionalKey(Schema.Boolean),
      disabled: Schema.optionalKey(Schema.Boolean),
    }),
  ]),
  inMessageOutputs: { RequestedToggle: { outMessage: OutMessage.OpenChanged } },
  view: { kind: 'Element', Inputs: Block.makeInputContract<ThinkingStepsViewInputs>() } satisfies {
    readonly kind: 'Element'
    readonly Inputs: unknown
  },
}

function plans<const Name extends string, const Key extends symbol>(
  Definition: ReturnType<typeof Block.make<Name, Key, typeof contract>>,
  details: boolean,
) {
  const { Message } = Definition

  const Composition = Definition.makeComposition()

  const update = Composition.makeUpdate({
    Toggled: toggle,
    CompletedPanel: (model, { generation }) => ({
      model:
        generation === model.generation && !model.open
          ? modifyFields(model, { hidden: () => true })
          : model,
    }),
    Hovered: (model, { hovered }) => ({
      model:
        hovered === model.hovered
          ? model
          : modifyFields(model, {
              hovered: () => hovered,
              hoverPaint: () => true,
              hoverGeneration: Number.increment,
            }),
    }),
    CompletedHover: (model, { generation }) => ({
      model:
        generation === model.hoverGeneration && !model.hovered
          ? modifyFields(model, { hoverPaint: () => false })
          : model,
    }),
  })

  const view = Composition.makeView.withInputs<ThinkingStepsViewInputs>((model, inputs, h) =>
    Disclosure.view(
      {
        id: model.id,
        isOpen: model.open,
        isDisabled: model.disabled,
        onToggle: () => Message.Toggled(),
        toView: ({ button: nativeButton, panel: nativePanel }) => {
          const { shape, size, icons } = resolvePresentation(inputs)
          const highlighted = model.open || model.hovered
          const panelEvent = `fluid-thinking-panel-${model.generation}`
          const hoverEvent = `fluid-thinking-hover-${model.hoverGeneration}`

          const panelComplete = Events.OnCustomEvent({
            name: panelEvent,
            f: (event) =>
              event.target === event.currentTarget
                ? Option.some(Message.CompletedPanel({ generation: model.generation }))
                : Option.none(),
          })

          const hoverComplete = Events.OnCustomEvent({
            name: hoverEvent,
            f: (event) =>
              event.target === event.currentTarget
                ? Option.some(Message.CompletedHover({ generation: model.hoverGeneration }))
                : Option.none(),
          })

          const label = () => inputs.label?.() ?? (model.details ? '' : 'Thinking')

          const renderHeader = () =>
            h.div(
              [
                h.Class('relative w-fit'),
                h.OnMouseEnter(Message.Hovered({ hovered: true })),
                h.OnMouseLeave(Message.Hovered({ hovered: false })),
              ],
              [
                model.hoverPaint
                  ? inputs.animate(
                      h.div([
                        h.Class(cn('absolute inset-0 pointer-events-none bg-hover', shape.bg)),
                        hoverComplete,
                      ]),
                      {
                        initial: { opacity: 0 },
                        animate: { opacity: model.hovered ? 1 : 0 },
                        transition: model.hovered ? { duration: 0.08 } : spring.fast.exit,
                        onAnimationComplete: (element) => {
                          element.dispatchEvent(new CustomEvent(hoverEvent))
                        },
                      },
                    )
                  : h.empty,
                h.button(
                  [
                    ...nativeButton.filter(
                      (attribute) => !Predicate.isTagged('OnKeyDownPreventDefault')(attribute),
                    ),
                    h.Disabled(model.disabled),
                    h.AriaControls(`${model.id}-panel`),
                    h.Class(
                      cn(
                        'relative z-10 flex items-center gap-2.5 cursor-pointer outline-none select-none',
                        shape.item,
                        size.px,
                        size.variant === 'compact' ? 'py-1.5' : 'py-2',
                        'focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] focus-visible:ring-offset-0',
                        model.details && 'py-1 px-3 gap-1.5',
                        inputs.triggerClassName,
                      ),
                    ),
                    ...(inputs.triggerAttributes ?? []),
                  ],
                  [
                    h.span(
                      [h.Class(cn('inline-grid text-left', size.text))],
                      [
                        h.span(
                          [
                            h.Class('col-start-1 row-start-1 invisible'),
                            h.AriaHidden(true),
                            h.Style({ fontVariationSettings: fontWeights.semibold }),
                          ],
                          [label()],
                        ),
                        h.span(
                          [
                            h.Class(
                              cn(
                                'col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80',
                                highlighted ? 'text-foreground' : 'text-muted-foreground',
                              ),
                            ),
                            h.Style({
                              fontVariationSettings: model.open
                                ? fontWeights.semibold
                                : fontWeights.normal,
                            }),
                          ],
                          [label()],
                        ),
                      ],
                    ),
                    inputs.animate(
                      h.span(
                        [h.Class('shrink-0 inline-flex items-center justify-center')],
                        [
                          icons['chevron-right'](
                            {
                              size: size.icon,
                              strokeWidth: highlighted ? 2 : 1.5,
                              className: cn(
                                'transition-[color,stroke-width] duration-80',
                                highlighted ? 'text-foreground' : 'text-muted-foreground',
                              ),
                            },
                            h,
                          ),
                        ],
                      ),
                      { animate: { rotate: model.open ? 90 : 0 }, transition: spring.fast },
                    ),
                  ],
                ),
              ],
            )

          const renderPanel = () =>
            h.div(
              [
                ...nativePanel,
                h.Id(`${model.id}-panel`),
                h.DataAttribute('state', model.open ? 'open' : 'closed'),
                ...(model.hidden ? [h.Hidden(true)] : []),
              ],
              [
                inputs.animate(
                  h.div(
                    [
                      h.Class('overflow-hidden'),
                      h.DataAttribute('thinking-open', String(model.open)),
                      h.DataAttribute('thinking-completion', panelEvent),
                      panelComplete,
                    ],
                    [
                      h.div(
                        [h.Class(cn('px-3 pb-3 pt-1 text-muted-foreground', size.type.body))],
                        [
                          h.div(
                            [
                              h.Class(
                                cn(
                                  'flex flex-col',
                                  model.details && 'gap-0.5 pt-0.5',
                                  inputs.contentClassName,
                                ),
                              ),
                              ...(inputs.contentAttributes ?? []),
                            ],
                            [
                              ...(model.details
                                ? (inputs.details ?? []).map((text) =>
                                    h.span(
                                      [h.Class(cn(size.type.caption, 'text-muted-foreground'))],
                                      [text],
                                    ),
                                  )
                                : []),
                              ...inputs.content(createPresentationContext(inputs)),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  {
                    initial: false,
                    animate: {},
                    resource: thinkingCollapseMotion,
                  },
                ),
              ],
            )

          return h.div(
            [
              h.Id(model.id),
              h.Class(cn(model.details ? 'mt-1 -ml-3' : 'w-80 max-w-full', inputs.className)),
              h.DataAttribute('state', model.open ? 'open' : 'closed'),
              ...(inputs.attributes ?? []),
            ],
            [
              ...(inputs.compose
                ? inputs.compose(renderHeader(), renderPanel())
                : [renderHeader(), renderPanel()]),
            ],
          )
        },
      },
      h,
    ),
  )

  const inMessageUpdate = Composition.makeInMessageUpdate({
    RequestedConfigure: (model, { open, disabled }) => ({
      model: modifyFields(changedOpen(model, open ?? model.internal), {
        controlled: () => Option.fromNullOr(open),
        disabled: () => disabled,
      }),
    }),
    RequestedToggle: toggle,
  })

  return {
    init: Composition.makeInit((config: ThinkingStepsConfig) => initialize(config, details)),
    update,
    inMessageUpdate,
    view,
  }
}

export interface ThinkingStepsViewInputs extends Presentation {
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  readonly label?: () => Html | string
  readonly details?: ReadonlyArray<string>
  readonly compose?: (header: Html, panel: Html) => ReadonlyArray<Html | string>
  readonly triggerAttributes?: ReadonlyArray<ChildAttribute>
  readonly contentAttributes?: ReadonlyArray<ChildAttribute>
  readonly content: (context: PresentationContext) => ReadonlyArray<Html | string>
  readonly className?: string
  readonly triggerClassName?: string
  readonly contentClassName?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

export const ThinkingStepsKey = Symbol('ThinkingSteps')

export const ThinkingStepDetailsKey = Symbol('ThinkingStepDetails')

export const ThinkingStepsBlock = Block.make('ThinkingSteps', {
  key: ThinkingStepsKey,
  ...contract,
})

export const ThinkingStepDetailsBlock = Block.make('ThinkingStepDetails', {
  key: ThinkingStepDetailsKey,
  ...contract,
})

export const ThinkingStepsLayer = ThinkingStepsBlock.makeLayer(plans(ThinkingStepsBlock, false))

export const ThinkingStepDetailsLayer = ThinkingStepDetailsBlock.makeLayer(
  plans(ThinkingStepDetailsBlock, true),
)
