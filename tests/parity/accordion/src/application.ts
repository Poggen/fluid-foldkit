import { Button } from '@foldkit/ui'
import { Boolean } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { Data, Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import type { Attribute } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import {
  AccordionBlock,
  AccordionGroupBlock,
  AccordionLayer,
  AccordionGroupLayer,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../../../registry/fluid/src/accordion.js'
import type { AccordionViewInputs } from '../../../../registry/fluid/src/accordion.js'
import { createMotionScope } from '../../../../registry/fluid/src/motion.js'
import { hoverHighlightAnimation } from '../../../../registry/fluid/src/hover-highlight.js'
import { createPresentationContext } from '../../../../registry/fluid/src/presentation.js'

import { initialConfig, initialItems } from './accordion-options.js'
import { accordionAppearanceProperty, AccordionFixtureCase } from './case.js'

const Model = Schema.Struct({
  config: AccordionFixtureCase,
  radix: AccordionBlock.Model,
  radixGroup: AccordionGroupBlock.Model,
  base: AccordionBlock.Model,
  baseGroup: AccordionGroupBlock.Model,
  requests: Schema.Array(Schema.Struct({ id: Schema.String, values: Schema.Array(Schema.String) })),
  isCompact: Schema.Boolean,
  isExpanded: Schema.Boolean,
  isReversed: Schema.Boolean,
  isSecondHidden: Schema.Boolean,
  appearance: Schema.Literals(['rounded', 'pill', 'sharp']),
  scale: Schema.Finite,
})

const Message = defineMessageUnion({
  ConfiguredPair: { values: Schema.Array(Schema.String) },
  ClickedConfigureRadix: { value: Schema.String },
  ClickedConfigureBase: { value: Schema.String },
  ClickedToggleSize: {},
  ClickedResizeContent: {},
  ClickedReorder: {},
  ClickedRemoveSecond: {},
})

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const effects = Block.makeEffectsContract()

export const AccordionFixtureKey = Symbol('AccordionFixture')

export const AccordionFixtureBlock = Block.make('AccordionFixture', {
  key: AccordionFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([AccordionFixtureCase]),
  ChildInitContext: AccordionFixtureCase,
  view: { kind: 'Document' },
  effects,
})

const Radix = AccordionFixtureBlock.makeRequiredFieldBinding(AccordionBlock, {
  field: 'radix',
  init: { contextToArgs: (config: AccordionFixtureCase) => [initialConfig('radix', config)] },
}).withOutMessagePolicy({
  fold: AccordionFixtureBlock.makeOutMessageFold(AccordionBlock, {
    ValueChanged: ({ values }) =>
      AccordionFixtureBlock.makeStep((model) => ({
        model:
          model.config.callback === true
            ? modifyFields(model, {
                requests: (requests) => [...requests, { id: 'radix', values }],
              })
            : model,
      })),
  }),
})

const RadixGroup = AccordionFixtureBlock.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'radixGroup',
  init: {
    contextToArgs: (config: AccordionFixtureCase) => [initialConfig('radix-group', config)],
  },
}).withOutMessagePolicy({
  fold: AccordionFixtureBlock.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: ({ values }) =>
      AccordionFixtureBlock.makeStep((model) => ({
        model:
          model.config.callback === true
            ? modifyFields(model, {
                requests: (requests) => [...requests, { id: 'radix-group', values }],
              })
            : model,
      })),
  }),
})

const Base = AccordionFixtureBlock.makeRequiredFieldBinding(AccordionBlock, {
  field: 'base',
  init: { contextToArgs: (config: AccordionFixtureCase) => [initialConfig('base', config)] },
}).withOutMessagePolicy({
  fold: AccordionFixtureBlock.makeOutMessageFold(AccordionBlock, {
    ValueChanged: ({ values }) =>
      AccordionFixtureBlock.makeStep((model) => ({
        model:
          model.config.callback === true
            ? modifyFields(model, { requests: (requests) => [...requests, { id: 'base', values }] })
            : model,
      })),
  }),
})

const BaseGroup = AccordionFixtureBlock.makeRequiredFieldBinding(AccordionGroupBlock, {
  field: 'baseGroup',
  init: { contextToArgs: (config: AccordionFixtureCase) => [initialConfig('base-group', config)] },
}).withOutMessagePolicy({
  fold: AccordionFixtureBlock.makeOutMessageFold(AccordionGroupBlock, {
    ValueChanged: ({ values }) =>
      AccordionFixtureBlock.makeStep((model) => ({
        model:
          model.config.callback === true
            ? modifyFields(model, {
                requests: (requests) => [...requests, { id: 'base-group', values }],
              })
            : model,
      })),
  }),
})

const AccordionFixtureComposition = AccordionFixtureBlock.makeComposition({
  bindings: [Radix, RadixGroup, Base, BaseGroup],
})

const init = AccordionFixtureComposition.makeInit((config: AccordionFixtureCase) => ({
  childInitContext: config,
  model: {
    config,
    requests: [],
    isCompact: config.size === 'compact',
    isExpanded: false,
    isReversed: false,
    isSecondHidden: false,
    appearance: config.shape ?? 'rounded',
    scale: config.scale ?? 1,
  },
}))

const update = AccordionFixtureComposition.makeUpdate({
  ConfiguredPair: AccordionFixtureBlock.makeStep(
    (_model, { values }: typeof Message.ConfiguredPair.Type) =>
      Update.combineSteps([
        Radix.informOfValue({ value: values }),
        RadixGroup.informOfValue({ value: values }),
        Base.informOfValue({ value: values }),
        BaseGroup.informOfValue({ value: values }),
      ]),
  ),
  ClickedConfigureRadix: AccordionFixtureBlock.makeStep(
    (_model, { value }: typeof Message.ClickedConfigureRadix.Type) =>
      Radix.informOfValue({ value }),
  ),
  ClickedConfigureBase: AccordionFixtureBlock.makeStep(
    (_model, { value }: typeof Message.ClickedConfigureBase.Type) => Base.informOfValue({ value }),
  ),
  ClickedToggleSize: (model) => ({
    model: modifyFields(model, { isCompact: Boolean.not }),
  }),
  ClickedResizeContent: (model) => ({
    model: modifyFields(model, { isExpanded: Boolean.not }),
  }),
  ClickedReorder: (model) => ({
    model: modifyFields(model, { isReversed: Boolean.not }),
  }),
  ClickedRemoveSecond: (model) => ({
    model: modifyFields(model, { isSecondHidden: Boolean.not }),
  }),
})

export const AccordionFixtureLayer = Layer.unwrap(
  Effect.sync(() => {
    const motion = createMotionScope('accordion-fixture')
    const animateHighlight = hoverHighlightAnimation(motion)

    const view = AccordionFixtureComposition.makeView((model, h) => {
      const { config } = model

      const presentation = createPresentationContext({
        reducedMotion: 'user',
        size: model.isCompact ? 'compact' : 'default',
        [accordionAppearanceProperty]: model.appearance,
      })

      const rows: ReturnType<typeof initialItems> = []

      for (const item of initialItems(config)) {
        if (model.isSecondHidden && item.value === 'second') {
          continue
        }

        if (model.isReversed) {
          rows.unshift(item)
        } else {
          rows.push(item)
        }
      }

      const renderRows: AccordionViewInputs['content'] = (rootContext) =>
        rows.map((item) =>
          AccordionItem(
            {
              ...item,
              children: (context) => [
                AccordionTrigger(
                  {
                    value: item.value,
                    attributes:
                      config.customIds === true ? [h.Id(`custom-${context.id}-${item.value}`)] : [],
                    children: [`Question ${item.value}`],
                  },
                  context,
                  h,
                ),
                AccordionContent(
                  {
                    value: item.value,
                    children: [
                      h.p([], ['A complete answer with enough content to measure.']),
                      ...(model.isExpanded
                        ? [
                            h.p(
                              [],
                              [
                                'Additional answer content changes the measured layout height without toggling this item.',
                              ],
                            ),
                          ]
                        : []),
                    ],
                  },
                  context,
                  h,
                ),
              ],
            },
            rootContext,
            h,
          ),
        )

      const content = (binding: typeof Radix, value: typeof model.radix) =>
        h.block(
          binding.embedView({
            slotId: value.id,
            model: value,
            viewInputs: {
              context: presentation,
              animate: motion.node,
              animateHighlight,
              content: renderRows,
            },
          }),
        )

      const toolbar =
        config.omitToolbar === true
          ? []
          : [
              Button.view(
                {
                  type: 'button',
                  onClick: Message.ClickedToggleSize(),
                  toView: (attributes) => h.button([...attributes.button], ['Toggle size']),
                },
                h,
              ),
              Button.view(
                {
                  type: 'button',
                  onClick: Message.ClickedResizeContent(),
                  toView: (attributes) => h.button([...attributes.button], ['Resize content']),
                },
                h,
              ),
              Button.view(
                {
                  type: 'button',
                  onClick: Message.ClickedReorder(),
                  toView: (attributes) => h.button([...attributes.button], ['Reorder items']),
                },
                h,
              ),
              Button.view(
                {
                  type: 'button',
                  onClick: Message.ClickedRemoveSecond(),
                  toView: (attributes) => h.button([...attributes.button], ['Remove second']),
                },
                h,
              ),
              Button.view(
                {
                  type: 'button',
                  onClick: Message.ClickedConfigureRadix({ value: 'second' }),
                  toView: (attributes) => h.button([...attributes.button], ['Set Radix value']),
                },
                h,
              ),
              Button.view(
                {
                  type: 'button',
                  onClick: Message.ClickedConfigureBase({ value: 'second' }),
                  toView: (attributes) => h.button([...attributes.button], ['Set Base value']),
                },
                h,
              ),
            ]

      return {
        title: 'Accordion parity',
        body: h.main(
          [
            h.Class(
              'p-[24px] grid gap-[32px] grid-cols-[repeat(2,288px)] transform-(--fluid-transform) origin-[top_left]',
            ),
            Events.OnCustomEvent({
              name: 'accordion-control-value',
              f: (event) => {
                if (!(event instanceof CustomEvent)) {
                  return Option.none()
                }

                const detail: unknown = event.detail

                return Option.map(
                  Schema.decodeUnknownOption(Schema.Array(Schema.String))(detail),
                  (values) => Message.ConfiguredPair({ values }),
                )
              },
            }),
            h.DataAttribute('requests', JSON.stringify(model.requests)),
            h.Style({ '--fluid-transform': `scale(${model.scale})` }),
          ],
          [
            ...toolbar,
            content(Radix, model.radix),
            h.block(
              RadixGroup.embedView({
                slotId: model.radixGroup.id,
                model: model.radixGroup,
                viewInputs: {
                  context: presentation,
                  animate: motion.node,
                  animateHighlight,
                  content: renderRows,
                },
              }),
            ),
            h.block(
              Base.embedView({
                slotId: model.base.id,
                model: model.base,
                viewInputs: {
                  context: presentation,
                  animate: motion.node,
                  animateHighlight,
                  content: renderRows,
                },
              }),
            ),
            h.block(
              BaseGroup.embedView({
                slotId: model.baseGroup.id,
                model: model.baseGroup,
                viewInputs: {
                  context: presentation,
                  animate: motion.node,
                  animateHighlight,
                  content: renderRows,
                },
              }),
            ),
          ],
        ),
      }
    })

    return AccordionFixtureBlock.makeLayer({ init, update, view }).pipe(
      Layer.provide(
        Layer.mergeAll(
          AccordionLayer,
          AccordionGroupLayer,
          AccordionLayer,
          AccordionGroupLayer,
          motion.layer,
        ),
      ),
    )
  }),
)

export const createAccordionFixture = (config: AccordionFixtureCase = {}) => ({
  block: AccordionFixtureBlock,
  layer: AccordionFixtureLayer,
  flags: config,
})
