/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { modifyFields } from 'foldkit/struct'
import { Data, Layer, Option, Predicate, Struct } from 'effect'
import type { Block } from 'foldkit'
import { Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { Attribute, ChildAttribute } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import * as Disclosure from '@foldkit/ui/disclosure'
import { initializeAccordion } from './accordion-initial.js'
import { accordionDisclosureId } from './accordion-identifiers.js'
import { HoverBlock, layer as HoverLayer } from './hover.js'
import { HoverHighlightBlock, layer as HoverHighlightLayer } from './hover-highlight.js'
import { EXIT_COMPLETE_EVENT } from './motion.js'
import { resolvePresentation } from './presentation.js'
import { cn } from './lib/utils.js'
import {
  accordionItems,
  accordionValues,
  accordionToggle,
  accordionRootProperties,
  configureAccordionRoot,
  synchronizeAccordion,
} from './accordion-state.js'
import type { AccordionConfig, AccordionItemConfig } from './accordion-state.js'
import { accordionContract, Observe, AccordionEffectsLayer } from './accordion-contract.js'
import type { AccordionContext } from './accordion-parts.js'
import { accordionExpansion, accordionFocusRing } from './accordion-render.js'

const { Message, InMessage } = accordionContract

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const publishDisclosureAttributes: <Message>(
  attributes: ReadonlyArray<Attribute<Message>>,
) => ReadonlyArray<ChildAttribute> = <Message>(attributes: ReadonlyArray<Attribute<Message>>) => {
  const published: Array<ChildAttribute> = []

  for (const attribute of attributes) {
    if ('_tag' in attribute) {
      published.push(...childAttributes([attribute]))
    } else {
      published.push(attribute)
    }
  }

  return published satisfies ReadonlyArray<ChildAttribute>
}

const tintAttributes = (value: string, generation: number, hover: boolean) =>
  childAttributes([
    Events.OnCustomEvent({
      name: EXIT_COMPLETE_EVENT,
      f: () => Option.some(Message.CompletedTint({ value, generation, hover })),
    }),
  ])

function accordionPlans<const Key extends symbol>(
  AccordionBlock: ReturnType<typeof Block.make<'Accordion', Key, typeof accordionContract>>,
  grouped: boolean,
) {
  const { Model, OutMessage } = accordionContract

  const Highlight = AccordionBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
    field: 'highlightChild',
    init: {
      contextToArgs: (config: AccordionConfig) => [
        {
          id: `${config.id}-highlight`,
          ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
        },
      ],
    },
  })

  const Hover = AccordionBlock.makeRequiredFieldBinding(HoverBlock, {
    field: 'hover',
    init: {
      contextToArgs: (config: AccordionConfig) => [
        { id: config.id, ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }) },
      ],
    },
  }).withOutMessagePolicy({
    fold: AccordionBlock.makeOutMessageFold(HoverBlock, {
      Changed: (snapshot) =>
        AccordionBlock.makeStep((model) =>
          Update.combineSteps([
            Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
            AccordionBlock.makeStep((model) => ({
              model: modifyFields(model, synchronizeAccordion(model, snapshot)),
            })),
          ]),
        ),
    }),
  })

  const AccordionComposition = AccordionBlock.makeComposition({
    bindings: [Hover, Highlight],
    mounts: [Observe],
  })

  const initialize = (config: AccordionConfig) =>
    initializeAccordion(grouped ? { ...config, grouped: true } : config)

  const init = AccordionComposition.makeInit(initialize)

  const activate = AccordionBlock.makeStep((model, { value }: { readonly value: string }) => {
    const values = accordionToggle(model, value)

    if (values === null) {
      return { model }
    }

    const internal = model.callback
      ? model
      : modifyFields(
          model,
          model.type === 'single'
            ? { internalSingleValue: () => values[0] ?? '' }
            : { internalMultipleValues: () => values },
        )

    const next =
      model.controlled || model.callback
        ? internal
        : modifyFields(internal, {
            values: () => values,
            items: () => accordionItems(model.items, values, model.items, model.generation + 1),
          })

    return {
      model: modifyFields(next, synchronizeAccordion(next, next.hover)),
      outMessage: OutMessage.ValueChanged({ values }),
    }
  })

  const requestDisclosure = AccordionBlock.makeStep(
    (model, { value, isOpen }: typeof Message.RequestedDisclosure.Type) =>
      model.values.includes(value) === isOpen
        ? AccordionBlock.makeNoopStep()(model)
        : activate(model, { value }),
  )

  const configureItems = (
    model: typeof Model.Type,
    items: ReadonlyArray<typeof AccordionItemConfig.Type>,
  ) => {
    const rows = accordionItems(items, model.values, model.items, model.generation + 1)

    if (JSON.stringify(rows) === JSON.stringify(model.items)) {
      return { model }
    }

    const next = modifyFields(model, { items: () => rows })

    return { model: modifyFields(next, synchronizeAccordion(next, model.hover)) }
  }

  const update = AccordionComposition.makeUpdate({
    ObservedItems: (model, { items }) => configureItems(model, items),
    ObservedTriggerIds: (model, { ids }) => ({
      model: modifyFields(model, {
        items: (currentItems) =>
          currentItems.map((item) => ({
            ...item,
            triggerId: ids.find((entry) => entry.value === item.value)?.id ?? null,
          })),
      }),
    }),
    ObservedTriggers: (model, { disabledValues }) => ({
      model: modifyFields(model, { disabledTriggers: () => disabledValues }),
    }),
    ObservedLayout: AccordionBlock.makeStep(
      (model, { layout }: typeof Message.ObservedLayout.Type) => {
        if (JSON.stringify(model.layout) === JSON.stringify(layout)) {
          return { model }
        }

        const next = modifyFields(model, { layout: () => layout })

        return Update.combineSteps([
          AccordionBlock.makeStep(() => ({
            model: modifyFields(next, synchronizeAccordion(next, next.hover)),
          })),
          Hover.requestMeasureItems(),
        ])
      },
    ),
    ObservedFocus: AccordionBlock.makeStep(
      (model, { value, visible }: typeof Message.ObservedFocus.Type) => {
        const next = modifyFields(model, { focusedValue: () => value, focusVisible: () => visible })
        const item = model.items.find((row) => row.value === value)

        return Update.combineSteps([
          AccordionBlock.makeStep(() => ({
            model: modifyFields(next, synchronizeAccordion(next, model.hover)),
          })),
          Hover.requestHighlight({ index: item?.index ?? null }),
        ])
      },
    ),
    ObservedPointer: AccordionBlock.makeStep(
      (model, { value, content }: typeof Message.ObservedPointer.Type) => {
        const pointerValue = content ? null : value
        const next = modifyFields(model, { pointerValue: () => pointerValue })

        return Update.combineSteps([
          AccordionBlock.makeStep(() => ({
            model: modifyFields(next, synchronizeAccordion(next, model.hover)),
          })),
          ...(content ? [Hover.requestClear()] : []),
        ])
      },
    ),
    ActivatedDisclosure: activate,
    RequestedDisclosure: requestDisclosure,
    CompletedPanel: (model, { value, generation }) => ({
      model: modifyFields(model, {
        items: (currentItems) =>
          currentItems.map((item) =>
            item.value === value &&
            item.generation === generation &&
            (item.toggling || item.hidden === item.open)
              ? { ...item, toggling: false, hidden: !item.open }
              : item,
          ),
      }),
    }),
    CompletedTint: (model, { value, generation, hover }) => ({
      model: modifyFields(
        model,
        hover
          ? {
              hovered: (hovered) =>
                hovered.filter(
                  (slot) => slot.value !== value || slot.generation !== generation || slot.present,
                ),
            }
          : {
              tints: (tints) =>
                tints.filter(
                  (slot) => slot.value !== value || slot.generation !== generation || slot.present,
                ),
            },
      ),
    }),
    CompletedFocusTint: (model, { generation }) => ({
      model: modifyFields(model, {
        focusTint: (currentFocusTint) =>
          currentFocusTint?.generation === generation && !currentFocusTint.present
            ? null
            : currentFocusTint,
      }),
    }),
    ObservedReducedMotion: (model, { reduce }) => ({
      model: modifyFields(model, { reduceMotion: () => reduce }),
    }),
  })

  const inMessageUpdate = AccordionComposition.makeInMessageUpdate({
    RequestedHoverMode: AccordionBlock.makeStep.fromMessage(
      ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
        Hover.requestConfigure({
          options: { mode, axis: 'y', nearest: false, gapClick: true, maxDistance: Infinity },
        }),
    ),
    InformedOfRoot: (model, { config }) => {
      const properties = accordionRootProperties(config)
      const next = modifyFields(model, configureAccordionRoot(model, properties))

      return { model: modifyFields(next, synchronizeAccordion(next, model.hover)) }
    },
    InformedOfValue: (model, { value }) => {
      const values = accordionValues(value)

      if (JSON.stringify(values) === JSON.stringify(model.values)) {
        return { model }
      }

      const next = modifyFields(model, {
        values: () => values,
        controlled: () => true,
        items: () => accordionItems(model.items, values, model.items, model.generation + 1),
      })

      return { model: modifyFields(next, synchronizeAccordion(next, model.hover)) }
    },
    InformedOfItems: (model, { items }) => configureItems(model, items),
  })

  const view = AccordionComposition.makeView.withInputs((model, inputs, h) => {
    const appearance = resolvePresentation(inputs).shape

    const context: AccordionContext<ChildAttribute<Mount.RequirementsOf<typeof Observe>>> = {
      disclosure: ({ value, isOpen, disabled }, render) =>
        Disclosure.view(
          {
            id: accordionDisclosureId(model.id, value),
            isOpen,
            isDisabled: disabled,
            onToggle: () => Message.ActivatedDisclosure({ value }),
            toView: ({ button, panel }) => {
              const attributes = button.filter(
                (attribute) => !Predicate.isTagged('OnKeyDownPreventDefault')(attribute),
              )

              return render({
                button: publishDisclosureAttributes([
                  ...attributes,
                  ...(disabled ? [h.Disabled(true)] : []),
                ]),
                panel: publishDisclosureAttributes(panel),
              })
            },
          },
          h,
        ),
      itemMount: childAttributes([h.OnMount(Observe())]),
      ...Struct.pick(inputs, ['context', 'shape', 'size', 'surface']),
      id: model.id,
      hoverMode: model.hover.mode,
      grouped: model.grouped,
      disabled: model.disabled,
      type: model.type,
      collapsible: model.collapsible,
      orientation: model.orientation,
      highlight: model.highlight,
      reduceMotion: model.reduceMotion,
      values: model.values,
      items: model.items,
      tints: model.tints,
      hovered: model.hovered,
      pointerValue: model.pointerValue,
      animate: inputs.animate,
      activeIndex: model.hover.activeIndex,
      tintAttributes,
    }

    return h.block(
      Hover.embedView({
        slotId: model.hover.id,
        model: model.hover,
        viewInputs: {
          className: cn(
            model.grouped
              ? 'relative flex flex-col w-72 max-w-full'
              : 'w-72 max-w-full flex flex-col',
            inputs.className,
          ),
          attributes: [
            ...childAttributes([
              h.DataAttribute('fluid-accordion', ''),
              h.DataAttribute('accordion-key', model.id),
              ...(model.disabled ? [h.DataAttribute('accordion-root-disabled', '')] : []),
              h.DataAttribute('orientation', model.orientation),
              h.Dir(model.direction),
            ]),
            ...(inputs.attributes ?? []),
          ],
          content: () => [
            ...(model.grouped
              ? model.tints.map((slot) =>
                  accordionExpansion(
                    slot,
                    appearance.bg,
                    inputs.animate,
                    tintAttributes(slot.value, slot.generation, false),
                    h,
                  ),
                )
              : []),
            ...(model.grouped
              ? [
                  h.block(
                    Highlight.embedView({
                      slotId: model.highlightChild.id,
                      model: model.highlightChild,
                      viewInputs: {
                        className: appearance.bg,
                        animate: inputs.animateHighlight,
                        mode: model.hover.mode,
                      },
                    }),
                  ),
                ]
              : []),
            model.grouped && model.focusTint
              ? accordionFocusRing(
                  model.focusTint,
                  appearance.focusRing,
                  inputs.animate,
                  childAttributes([
                    Events.OnCustomEvent({
                      name: EXIT_COMPLETE_EVENT,
                      f: () =>
                        Option.some(
                          Message.CompletedFocusTint({
                            generation: model.focusTint?.generation ?? 0,
                          }),
                        ),
                    }),
                  ]),
                  h,
                )
              : null,
            ...inputs.content(context),
          ],
        },
      }),
    )
  })

  return {
    init,
    update,
    inMessageUpdate,
    view,
    EffectsLayer: AccordionEffectsLayer,
  }
}

export const accordionLayer = <const Key extends symbol>(
  block: ReturnType<typeof Block.make<'Accordion', Key, typeof accordionContract>>,
  grouped: boolean,
) =>
  block
    .makeLayer(accordionPlans<Key>(block, grouped))
    .pipe(Layer.provide(Layer.mergeAll(HoverLayer, HoverHighlightLayer)))
