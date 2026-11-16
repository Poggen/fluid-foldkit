import { Button, Input } from '@foldkit/ui'
import { Boolean, Number } from 'effect'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { HoverBlock, layer as HoverLayer } from '@foldkit-visuals/fluid/hover'
import {
  HoverHighlightBlock,
  layer as HoverHighlightLayer,
  hoverHighlightAnimation,
} from '@foldkit-visuals/fluid/hover-highlight'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import './hover.css'

const Model = Schema.Struct({
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
  count: Schema.Finite,
  isMounted: Schema.Boolean,
  isMiddleVisible: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedPicked: {},
  ClickedNearest: {},
  ClickedDirect: {},
  ClickedKeyboard: {},
  ClickedClear: {},
  ClickedRemeasure: {},
  ClickedToggle: {},
  ClickedFilter: {},
})

export const FluidHoverExampleKey = Symbol('FluidHoverExample')

const effects = Block.makeEffectsContract()

const FluidHoverExampleBlock = Block.make('FluidHoverExample', {
  key: FluidHoverExampleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Document' },
  effects,
})

const motion = createMotionScope('fluid-hover-parity')

const Highlight = FluidHoverExampleBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: () => [
      {
        mode: exampleHoverConfig.hoverMode,
        id: 'hover-highlight',
      },
    ],
  },
})

const Hover = FluidHoverExampleBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: () => [
      {
        mode: exampleHoverConfig.hoverMode,
        id: 'hover-region',
      },
    ],
  },
}).withOutMessagePolicy({
  fold: FluidHoverExampleBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) => Highlight.informOfSource({ snapshot, hidden: false }),
  }),
})

const FluidHoverExampleComposition = FluidHoverExampleBlock.makeComposition({
  bindings: [Hover, Highlight],
})

const init = FluidHoverExampleComposition.makeInit(() => ({
  model: { count: 0, isMounted: true, isMiddleVisible: true },
}))

const update = FluidHoverExampleComposition.makeUpdate({
  ClickedPicked: FluidHoverExampleBlock.makeFieldsStep(() => ({ count: Number.increment })),
  ClickedNearest: Hover.requestConfigure({
    options: { axis: 'y', nearest: true, gapClick: true, maxDistance: 24 },
  }),
  ClickedDirect: Hover.requestConfigure({
    options: { axis: 'y', nearest: false, gapClick: true, maxDistance: Infinity },
  }),
  ClickedKeyboard: Hover.requestHighlight({ index: 2 }),
  ClickedClear: Hover.requestClear(),
  ClickedRemeasure: Hover.requestRemeasure(),
  ClickedToggle: FluidHoverExampleBlock.makeFieldsStep(() => ({ isMounted: Boolean.not })),
  ClickedFilter: FluidHoverExampleBlock.makeFieldsStep(() => ({ isMiddleVisible: Boolean.not })),
})

const view = FluidHoverExampleComposition.makeView((model, h) => ({
  title: 'Fluid hover parity',
  body: h.main(
    [h.Class('p-6')],
    [
      h.h1([], ['Fluid hover parity']),
      h.div(
        [h.Class('flex gap-2 m-[16px_0] [&_button]:p-2 [&_button]:[border:1px_solid_#bbb]')],
        [
          Button.view(
            {
              onClick: Message.ClickedNearest(),
              toView: (attributes) => h.button([...attributes.button], ['Nearest']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedDirect(),
              toView: (attributes) => h.button([...attributes.button], ['Direct']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedKeyboard(),
              toView: (attributes) => h.button([...attributes.button], ['Highlight third']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedClear(),
              toView: (attributes) => h.button([...attributes.button], ['Clear']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedRemeasure(),
              toView: (attributes) => h.button([...attributes.button], ['Remeasure']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedToggle(),
              toView: (attributes) => h.button([...attributes.button], ['Toggle mount']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedFilter(),
              toView: (attributes) => h.button([...attributes.button], ['Filter middle']),
            },
            h,
          ),
        ],
      ),
      h.output(
        [h.Class('block text-[13px]'), h.Id('snapshot')],
        [
          JSON.stringify({
            activeIndex: model.hover.activeIndex,
            session: model.hover.session,
            isMeasured: model.hover.isMeasured,
            itemRects: model.hover.itemRects,
          }),
        ],
      ),
      h.output([h.Class('block text-[13px]'), h.Id('count')], [String(model.count)]),
      model.isMounted
        ? h.block(
            Hover.embedView({
              slotId: model.hover.id,
              model: model.hover,
              viewInputs: {
                className: 'hover-region relative w-75 p-6 [border:2px_solid_#888] mt-4',
                content: ({ itemAttributes }) => [
                  h.block(
                    Highlight.embedView({
                      slotId: model.highlight.id,
                      model: model.highlight,
                      viewInputs: {
                        className: resolvePresentation(examplePresentation).shape.bg,
                        animate: hoverHighlightAnimation(motion),
                        ...examplePresentation,
                      },
                    }),
                  ),
                  h.div(
                    [h.Class('mb-4')],
                    [
                      Input.view(
                        {
                          id: 'hover-gap-control',
                          placeholder: 'Gap control',
                          toView: (attributes) =>
                            h.input([...attributes.input, h.AriaLabel('Between rows')]),
                        },
                        h,
                      ),
                    ],
                  ),
                  ...[0, 1, 2, 3].flatMap((index) =>
                    index !== 1 || model.isMiddleVisible
                      ? [
                          h.button(
                            [
                              ...itemAttributes(index, index === 3),
                              h.Id(`row-${index}`),
                              h.Class('relative block w-62 h-10 mb-3 text-left p-2'),
                              h.Disabled(index === 3),
                              h.OnClick(Message.ClickedPicked()),
                            ],
                            [`Row ${index + 1}`],
                          ),
                        ]
                      : [],
                  ),
                ],
                ...examplePresentation,
              },
            }),
          )
        : h.empty,
    ],
  ),
}))

const layer = FluidHoverExampleBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.merge(HoverLayer, HoverHighlightLayer)),
)

Runtime.run(
  Program.make({
    block: FluidHoverExampleBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide(motion.layer),
)
