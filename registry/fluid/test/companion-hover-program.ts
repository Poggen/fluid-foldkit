import { Effect, Layer, Schema, Schedule } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { HoverBlock, layer as HoverLayer } from '../src/hover.js'
import type { CardGroupRefs } from '../src/card.js'
import { CardGroupBlock, CardGroupRefsServerLayer, layer as CardLayer } from '../src/card.js'
import { createTargetMotionScope } from '../src/motion-target.js'
import { hoverHighlightAnimation } from '../src/hover-highlight.js'

const Model = Schema.Struct({ hover: HoverBlock.Model, cards: CardGroupBlock.Model })

const Json = Schema.fromJsonString(Schema.toCodecJson(Model))

const Message = defineMessageUnion({
  Disable: {},
  Enable: {},
  Activate: {},
  Measure: {},
  CardEnable: {},
  CardDisable: {},
})

const Key = Symbol('CompanionHoverProgram')

const effects = Block.makeEffectsContract<never, CardGroupRefs>()

const Parent = Block.make('CompanionHoverProgram', {
  key: Key,
  Model,
  Message,
  effects,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})

const Hover = Parent.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: { contextToArgs: () => [{ id: 'hover' }] },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(HoverBlock, { Changed: Parent.makeNoopStep }),
})

const Cards = Parent.makeRequiredFieldBinding(CardGroupBlock, {
  field: 'cards',
  init: { contextToArgs: () => [{ id: 'cards', fluidHover: false }] },
})

const Composition = Parent.makeComposition({ bindings: [Hover, Cards] })

const init = Composition.makeInit(() => ({ model: {}, childInitContext: undefined }))

const update = Composition.makeUpdate({
  Disable: Hover.requestPointerHandlers({ enabled: false }),
  Enable: Hover.requestPointerHandlers({ enabled: true }),
  Activate: Hover.requestHighlight({ index: 0 }),
  Measure: Hover.requestRemeasure(),
  CardEnable: Cards.requestFluidHover({ enabled: true }),
  CardDisable: Cards.requestFluidHover({ enabled: false }),
})

const makeLayer = (motion: ReturnType<typeof createTargetMotionScope>) => {
  const view = Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button([h.Id('disable'), h.OnClick(Message.Disable())], ['Disable']),
        h.button([h.Id('enable'), h.OnClick(Message.Enable())], ['Enable']),
        h.button([h.Id('activate'), h.OnClick(Message.Activate())], ['Activate']),
        h.button([h.Id('measure'), h.OnClick(Message.Measure())], ['Measure']),
        h.button([h.Id('card-enable'), h.OnClick(Message.CardEnable())], ['Enable cards']),
        h.button([h.Id('card-disable'), h.OnClick(Message.CardDisable())], ['Disable cards']),
        h.pre([h.Id('hover-snapshot')], [Schema.encodeSync(Json)(model)]),
        h.block(
          Hover.embedView({
            slotId: model.hover.id,
            model: model.hover,
            viewInputs: {
              content: (state) =>
                [0, 1].map((index) =>
                  h.div([h.Id(`row-${index}`), ...state.itemAttributes(index)], [String(index)]),
                ),
            },
          }),
        ),
        h.block(
          Cards.embedView({
            slotId: model.cards.id,
            model: model.cards,
            viewInputs: {
              count: 0,
              animateHighlight: hoverHighlightAnimation(motion),
              children: () => [],
            },
          }),
        ),
      ],
    ),
  )

  const implementation = { init, update, view }

  return Parent.makeLayer<typeof implementation>(implementation).pipe(
    Layer.provide(Layer.mergeAll(HoverLayer, CardLayer)),
  )
}

export const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 100, schedule: Schedule.spaced('10 millis') }))

export const acquireHover = Effect.gen(function* acquireHoverProgram() {
  const motion = createTargetMotionScope('companion-hover-program')
  const layer = makeLayer(motion)

  const host = document.createElement('div')
  const container = document.createElement('div')

  container.id = 'companion-hover-root'
  host.append(container)
  document.body.append(host)

  const program = Runtime.embed(
    Program.makeElement({ block: Parent, layer, container }).provide(
      Layer.merge(motion.layer, CardGroupRefsServerLayer),
    ),
  )

  yield* Effect.addFinalizer(() =>
    Effect.promise(program.dispose).pipe(
      Effect.andThen(() =>
        Effect.sync(() => {
          host.remove()
        }),
      ),
    ),
  )

  const snapshot = () =>
    Schema.decodeSync(Json)(host.querySelector('#hover-snapshot')?.textContent ?? '')

  yield* eventually(() => {
    snapshot()
  })

  const element = (id: string) => {
    const found = host.querySelector<HTMLElement>(`#${id}`)

    if (found === null) {
      throw new Error(`Missing ${id}`)
    }

    return found
  }

  const root = element('hover')
  Object.defineProperties(root, {
    offsetWidth: { value: 120 },
    offsetHeight: { value: 120 },
    getBoundingClientRect: { value: () => new DOMRect(0, 0, 120, 120) },
  })

  for (const index of [0, 1]) {
    Object.defineProperties(element(`row-${index}`), {
      offsetWidth: { value: 120 },
      offsetHeight: { value: 60 },
      offsetTop: { value: index * 60 },
      offsetLeft: { value: 0 },
      offsetParent: { value: root },
    })
  }

  return {
    snapshot,
    root,
    click: (id: string) =>
      Effect.sync(() => {
        element(id).click()
      }),
  }
})
