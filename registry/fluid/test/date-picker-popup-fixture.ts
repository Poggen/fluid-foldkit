import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { PopupBlock, layer as PopupLayer } from '../src/date-picker-popup.js'
import type { PopupConfig } from '../src/date-picker-popup-definition.js'
import type { PopupAuthority } from '../src/date-picker-popup-authority.js'

const Message = defineMessageUnion({ Open: {}, Close: {} })

const PopupFixtureKey = Symbol('PopupPortalFixture')

export const PopupFixture = Block.make('PopupPortalFixture', {
  key: PopupFixtureKey,
  Model: Schema.Struct({ popup: PopupBlock.Model }),
  Message,
  InitArgs: Schema.Tuple([]),
  ChildInitContext: Schema.String,
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<never, PopupAuthority>(),
})

const RawPopup = PopupFixture.makeRequiredFieldBinding(PopupBlock, {
  field: 'popup',
  init: {
    contextToArgs: (id: string): [PopupConfig, boolean, boolean] => [
      { id: `${id}-popup`, anchorId: `${id}-anchor`, kind: 'trigger', align: 'start' },
      false,
      false,
    ],
  },
})

const Popup = RawPopup.withOutMessagePolicy({
  fold: PopupFixture.makeOutMessageFold(PopupBlock, {
    DismissRequested: () => RawPopup.requestVisibility({ open: false, escapeBlocked: false }),
    Released: PopupFixture.makeNoopStep,
  }),
})

const Composition = PopupFixture.makeComposition({ bindings: [Popup] })

export const popupFixtureLayer = (id: string) =>
  PopupFixture.makeLayer({
    init: Composition.makeInit(() => ({ childInitContext: id, model: {} })),
    update: Composition.makeUpdate({
      Open: Popup.requestVisibility({ open: true, escapeBlocked: false }),
      Close: Popup.requestVisibility({ open: false, escapeBlocked: false }),
    }),
    view: Composition.makeView((model, h) =>
      h.div(
        [h.DataAttribute('popup-fixture', id)],
        [
          h.button([h.Id(`${id}-anchor`), h.OnClick(Message.Open())], ['Open']),
          h.button([h.Id(`${id}-close`), h.OnClick(Message.Close())], ['Close']),
          h.div(
            [h.Id(`${id}-origin`)],
            [
              h.block(
                Popup.embedView({
                  slotId: model.popup.config.id,
                  model: model.popup,
                  viewInputs: {
                    animate: (node) => node,
                    content: () => [h.button([h.Id(`${id}-option`)], ['Option'])],
                  },
                }),
              ),
              h.span([h.Id(`${id}-next`)], ['Next sibling']),
            ],
          ),
        ],
      ),
    ),
    EffectsLayer: Layer.empty,
  }).pipe(Layer.provide(PopupLayer))
