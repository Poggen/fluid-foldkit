import { ComponentPresentation } from '../settings'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion } from 'foldkit/message'
import { ThinkingDemoBlock } from '../../../registry/fluid/examples/src/thinking-example-playback'
import { layer as ThinkingDemoLayer } from '../../../registry/fluid/examples/src/thinking-example-block'
import {
  ThinkingTraceBlock,
  layer as ThinkingTraceLayer,
} from '../../../registry/fluid/examples/src/thinking-trace'
import { demos } from '../../../registry/fluid/examples/src/thinking-example-data'
const key = Symbol('AuthoredThinking')
export const AuthoredThinkingBlock = Block.make('AuthoredThinking', {
  key,
  InitArgs: Schema.Tuple([]),
  Message: Schema.Never,
  Model: Schema.Struct({
    demos: Schema.Record(Schema.String, ThinkingDemoBlock.Model),
    trace: ThinkingTraceBlock.Model,
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  view: { kind: 'Element', Inputs: Block.makeInputContract<{ readonly ready: boolean }>() },
})
const Root = AuthoredThinkingBlock
const Demos = Root.makeRecordBinding(ThinkingDemoBlock, { field: 'demos' })
const Trace = Root.makeRequiredFieldBinding(ThinkingTraceBlock, {
  field: 'trace',
  init: { contextToArgs: () => [] },
})
const Composition = Root.makeComposition({ bindings: [Demos, Trace] })
const initThinkingDemos = Root.makeStep(() =>
  Update.combineSteps(
    demos.map((demo) =>
      Root.makeStep((model) => initAndInsert(Demos, model, { key: demo.id, args: [demo.id] })),
    ),
  ),
)
export const layer = Root.makeLayer({
  init: Composition.makeInit(() => ({ model: { demos: {} }, steps: [initThinkingDemos] })),
  update: Composition.makeUpdate({}),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        Trace.informOfDocumentation({
          embedded: true,
          shape: settings.shape,
          size: settings.size,
          hoverMode: settings.hover,
        }),
        ...Object.keys(model.demos).map((key) =>
          Demos.informOfDocumentation(key, {
            embedded: true,
            shape: settings.shape,
            size: settings.size,
            hoverMode: settings.hover,
          }),
        ),
      ]),
    ),
  }),
  view: Composition.makeView.withInputs((model, { ready }, h) =>
    !ready
      ? h.empty
      : h.div(
          [],
          [
            ...demos.flatMap((demo) => {
              const child = model.demos[demo.id]
              return child === undefined
                ? []
                : [
                    h.block(
                      Demos.embedView({
                        key: demo.id,
                        slotId: `authored-thinking-${demo.id}`,
                        model: child,
                      }),
                    ),
                  ]
            }),
            h.block(Trace.embedView({ slotId: 'authored-thinking-trace', model: model.trace })),
          ],
        ),
  ),
}).pipe(Layer.provide(Layer.mergeAll(ThinkingDemoLayer, ThinkingTraceLayer)))
