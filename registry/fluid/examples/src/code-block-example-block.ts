import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion } from 'foldkit/message'
import { CodeBlockBlock, layer as CodeBlockLayer } from '../../src/code-block.js'
import type { CodeBlockViewInputs } from '../../src/code-block.js'

export const sampleCode = "const greeting = 'Hello, Fluid'\nconsole.log(greeting)"
const key = Symbol('CodeBlockExample')
export const CodeBlockExampleBlock = Block.make('CodeBlockExample', {
  key,
  InitArgs: Schema.Tuple([Schema.String]),
  ChildInitContext: Schema.String,
  Model: Schema.Struct({ code: CodeBlockBlock.Model, copiedCount: Schema.Natural }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({ RequestedCode: { code: Schema.String } }),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof CodeBlockBlock>['programRequirements']
  >(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<CodeBlockViewInputs>() },
})
const Root = CodeBlockExampleBlock
const Code = Root.makeRequiredFieldBinding(CodeBlockBlock, {
  field: 'code',
  init: { contextToArgs: (id: string) => [{ id, code: sampleCode }] },
}).withOutMessagePolicy({
  fold: Root.makeOutMessageFold(CodeBlockBlock, {
    Copied: () => Root.makeFieldsStep(() => ({ copiedCount: (count) => count + 1 })),
  }),
})
const Composition = Root.makeComposition({ bindings: [Code] })
export const layer = Root.makeLayer({
  init: Composition.makeInit((id) => ({ childInitContext: id, model: { copiedCount: 0 } })),
  update: Composition.makeUpdate({}),
  inMessageUpdate: Composition.makeInMessageUpdate({
    RequestedCode: Root.makeStep.fromMessage(({ code }) => Code.requestCode({ code })),
  }),
  view: Composition.makeView.withInputs((model, inputs, h) =>
    h.div(
      [h.Class('w-full min-w-0')],
      [
        h.block(Code.embedView({ slotId: 'code', model: model.code, viewInputs: inputs })),
        h.p(
          [h.Class('text-site-caption text-muted-foreground mt-2'), h.AriaLive('polite')],
          [
            model.copiedCount === 0
              ? 'Copy the code to your clipboard.'
              : `Copied ${model.copiedCount} ${model.copiedCount === 1 ? 'time' : 'times'}`,
          ],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(CodeBlockLayer))
