/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Data, Option, Predicate } from 'effect'
import { childAttributes } from 'foldkit/html'
import type { Attribute } from 'foldkit/html'
import type { InputMessageMessage } from './composition.js'
import { Composition } from './composition.js'
import { Message, Observe } from './definition.js'
import { Files, Queue, FilesRegion, QueueRegion } from '../input-message-bindings.js'
import { SuggestionsRegion, Hover, Highlight } from '../input-message-regions.js'
import type { InputMessageViewInputs } from '../input-message-view.js'
import { inputMessagePaint } from '../input-message-view.js'
import { InputMessageSuggestionRow } from '../input-message-parts.js'
import { createPresentationContext, resolvePresentation } from '../presentation.js'
import { toHighlightTarget, resolveHighlightTransition } from '../hover-highlight.js'
import { spring } from '../lib/springs.js'

const Events =
  Data.taggedEnum<Extract<Attribute<InputMessageMessage>, { readonly _tag: 'OnCustomEvent' }>>()

export const view = Composition.makeView.withInputs<InputMessageViewInputs>((model, inputs, h) => {
  const presentation = resolvePresentation(inputs)

  const context = createPresentationContext({
    ...inputs,
    surface: 2,
    hasSizeProvider: inputs.size !== undefined || presentation.hasSizeProvider,
  })

  return inputMessagePaint(
    { ...model, activeSuggestion: model.hover.activeIndex },
    {
      ...inputs,
      filesRegion: () =>
        h.block(
          FilesRegion.embedView({
            slotId: model.filesRegion.presence.id,
            model: model.filesRegion,
            viewInputs: {
              animate: inputs.animate,
              content: (payload, attributes) =>
                h.block(
                  Files.embedView({
                    slotId: model.filesView.id,
                    model: model.filesView,
                    viewInputs:
                      model.filesRegion.presence.phase === 'Exiting' &&
                      Predicate.isTagged(payload, 'Files')
                        ? {
                            context,
                            isTouch: model.isTouch,
                            animate: inputs.animate,
                            tooltip: inputs.tooltip,
                            attributes,
                            retainedFiles: payload.items,
                          }
                        : {
                            context,
                            isTouch: model.isTouch,
                            animate: inputs.animate,
                            tooltip: inputs.tooltip,
                            attributes,
                          },
                  }),
                ),
            },
          }),
        ),
      queueRegion: () =>
        h.block(
          QueueRegion.embedView({
            slotId: model.queueRegion.presence.id,
            model: model.queueRegion,
            viewInputs: {
              animate: inputs.animate,
              content: (payload, attributes) =>
                h.block(
                  Queue.embedView({
                    slotId: model.queueView.id,
                    model: model.queueView,
                    viewInputs:
                      model.queueRegion.presence.phase === 'Exiting' &&
                      Predicate.isTagged(payload, 'Queue')
                        ? {
                            context,
                            getReorder: inputs.getReorder,
                            tooltip: inputs.tooltip,
                            attributes,
                            isTouch: model.isTouch,
                            reduceMotion: model.reduceMotion,
                            retainedItems: payload.items,
                          }
                        : {
                            context,
                            getReorder: inputs.getReorder,
                            tooltip: inputs.tooltip,
                            attributes,
                            isTouch: model.isTouch,
                            reduceMotion: model.reduceMotion,
                          },
                  }),
                ),
            },
          }),
        ),
      suggestionsRegion: () =>
        h.block(
          SuggestionsRegion.embedView({
            slotId: model.suggestionsRegion.presence.id,
            model: model.suggestionsRegion,
            viewInputs: {
              animate: inputs.animate,
              content: (payload, attributes) =>
                h.block(
                  Hover.embedView({
                    slotId: model.hover.id,
                    model: model.hover,
                    viewInputs: {
                      attributes: [
                        ...attributes,
                        ...childAttributes([
                          h.Id(`${model.id}-suggestions`),
                          h.Role('listbox'),
                          h.AriaLabel('Suggested prompts'),
                        ]),
                      ],
                      content: (snapshot) => [
                        h.block(
                          Highlight.embedView({
                            slotId: model.highlight.id,
                            model: model.highlight,
                            viewInputs: {
                              className: presentation.shape.bg,
                              mode: model.hover.mode,
                              animate: (node, present, rect, reduceMotion) =>
                                inputs.animate(node, {
                                  initial: { opacity: 0, ...toHighlightTarget(rect) },
                                  animate: { opacity: 1, ...toHighlightTarget(rect) },
                                  exit: { opacity: 0, transition: spring.fast.exit },
                                  transition: resolveHighlightTransition(undefined, reduceMotion),
                                  present,
                                }),
                            },
                          }),
                        ),
                        ...(Predicate.isTagged(payload, 'Suggestions') ? payload.items : []).map(
                          (text, index) =>
                            InputMessageSuggestionRow(
                              {
                                context,
                                text,
                                active: snapshot.activeIndex === index,
                                keyHint: index === 0 && snapshot.activeIndex === null,
                                optionId: `${model.hover.id}-${index}`,
                                attributes: [
                                  ...snapshot.itemAttributes(index),
                                  ...childAttributes([h.OnClick(Message.CapturedFill({ text }))]),
                                ],
                              },
                              h,
                            ),
                        ),
                      ],
                    },
                  }),
                ),
            },
          }),
        ),
    },
    h,
    {
      observe: childAttributes([h.OnMount(Observe())]),
      buttonComplete: Events.OnCustomEvent({
        name: 'fluid-exit-complete',
        f: () => Option.some(Message.CompletedButtonExit()),
      }),
      input: h.OnInput((value) => Message.CapturedValue({ value })),
      blur: h.OnBlur(Message.CapturedBlur()),
      enter: h.OnMouseEnter(Message.CapturedHover({ hovered: true })),
      leave: h.OnMouseLeave(Message.CapturedHover({ hovered: false })),
      submit: h.OnClick(Message.CapturedSubmit()),
      stop: h.OnClick(Message.CapturedStop()),
    },
  )
})
