// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
import { childAttributes } from 'foldkit/html'
import { createPresentationContext } from './presentation.js'
import type { ScrollAreaConfig } from './scroll-area.js'
import { Block, Update } from 'foldkit'
import { Layer, Schema } from 'effect'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { CodeBlock } from './code-block-parts.js'
import type { CodeBlockProps } from './code-block-parts.js'
import {
  InputCopyControlBlock,
  controlLayer,
  createInputCopyControlLayer,
} from './input-copy-control.js'
import { ScrollAreaBlock, layer as scrollLayer } from './scroll-area.js'

export { CodeBlock } from './code-block-parts.js'
export type { CodeBlockProps } from './code-block-parts.js'
export { createInputCopyControlLayer as createCodeBlockLayer }

const Config = Schema.Struct({ id: Schema.String, code: Schema.String })
export type CodeBlockConfig = typeof Config.Type
export interface CodeBlockViewInputs extends Omit<
  CodeBlockProps,
  'code' | 'copyControl' | 'scroll'
> {
  readonly reducedMotion?: 'user' | 'always' | 'never'
  readonly portalContainerId?: string
}
const InMessage = defineInMessageUnion({
  RequestedCode: { code: Schema.String },
  RequestedCopy: {},
})
const OutMessage = defineMessageUnion({ Copied: {} })
export const CodeBlockKey = Symbol('CodeBlock')
export const CodeBlockBlock = Block.make('CodeBlock', {
  key: CodeBlockKey,
  InitArgs: Schema.Tuple([Config]),
  Model: Schema.Struct({
    id: Schema.String,
    copy: InputCopyControlBlock.Model,
    scroll: ScrollAreaBlock.Model,
  }),
  Message: defineMessageUnion({}),
  InMessage,
  OutMessage,
  inMessageOutputs: { RequestedCode: { outMessage: OutMessage } },
  view: { kind: 'Element', Inputs: Block.makeInputContract<CodeBlockViewInputs>() },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof InputCopyControlBlock>['programRequirements']
  >(),
})
const Copy = CodeBlockBlock.makeRequiredFieldBinding(InputCopyControlBlock, {
  field: 'copy',
  init: {
    contextToArgs: (config: CodeBlockConfig) => [{ id: `${config.id}-copy`, value: config.code }],
  },
}).withOutMessagePolicy({
  fold: CodeBlockBlock.makeOutMessageFold(InputCopyControlBlock, {
    Copied: () =>
      CodeBlockBlock.makeStep((model) => Update.withOutMessage({ model }, OutMessage.Copied())),
  }),
})
const Scroll = CodeBlockBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: {
    contextToArgs: (config: CodeBlockConfig) => [
      { id: `${config.id}-scroll`, orientation: 'both' } satisfies ScrollAreaConfig,
    ],
  },
}).withOutMessagePolicy({
  fold: CodeBlockBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: CodeBlockBlock.makeNoopStep,
  }),
})
const CodeBlockComposition = CodeBlockBlock.makeComposition({ bindings: [Copy, Scroll] })
export const layer = CodeBlockBlock.makeLayer({
  init: CodeBlockComposition.makeInit((config: CodeBlockConfig) => ({
    childInitContext: config,
    model: { id: config.id },
  })),
  update: CodeBlockComposition.makeUpdate({}),
  inMessageUpdate: CodeBlockComposition.makeInMessageUpdate({
    RequestedCopy: Copy.requestCopy(),
    RequestedCode: CodeBlockBlock.makeStep.fromMessage(
      (message: typeof InMessage.RequestedCode.Type) =>
        Copy.requestConfigure({ value: message.code, disabled: false }),
    ),
  }),
  view: CodeBlockComposition.makeView.withInputs((model, inputs, h) => {
    const context = createPresentationContext(inputs)
    return CodeBlock(
      {
        ...inputs,
        code: model.copy.copy.value,
        attributes: [...childAttributes([h.Id(model.id)]), ...(inputs.attributes ?? [])],
        copyControl: () =>
          h.div(
            [],
            [
              h.block(
                Copy.embedView({
                  slotId: 'copy',
                  model: model.copy,
                  viewInputs: {
                    context,
                    ...(inputs.reducedMotion === undefined
                      ? {}
                      : { reducedMotion: inputs.reducedMotion }),
                    ...(inputs.portalContainerId === undefined
                      ? {}
                      : { portalContainerId: inputs.portalContainerId }),
                    className: 'shrink-0',
                    label: '',
                    iconOnly: true,
                    accessibleLabel: 'Copy code',
                  },
                }),
              ),
              h.span(
                [h.Class('sr-only'), h.Role('status'), h.AriaLive('polite')],
                [
                  model.copy.copy.status === 'idle'
                    ? ''
                    : model.copy.copy.status === 'error'
                      ? 'Copy failed'
                      : 'Copied',
                ],
              ),
            ],
          ),
        scroll: (content, viewportClassName) =>
          h.block(
            Scroll.embedView({
              slotId: 'scroll',
              model: model.scroll,
              viewInputs: {
                context,
                children: [content],
                viewportClassName,
                viewportAttributes: childAttributes([
                  h.Role('region'),
                  h.AriaLabel(inputs.label ?? inputs.filename ?? inputs.language ?? 'Code'),
                  h.DataAttribute('language', inputs.language ?? 'plaintext'),
                ]),
              },
            }),
          ),
      },
      h,
    )
  }),
}).pipe(Layer.provide(Layer.mergeAll(controlLayer, scrollLayer)))
