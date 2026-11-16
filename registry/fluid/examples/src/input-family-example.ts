import { Button as UiButton } from '@foldkit/ui'
import { examplePresentation } from './example-presentation.js'
import { Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Button } from '@foldkit-visuals/fluid/button'
import { createInputCopyLayer } from '@foldkit-visuals/fluid/input-copy'
import {
  createInputMessageLayer,
  createInputMessageFileRegistry,
} from '@foldkit-visuals/fluid/input-message'
import { makeFileThumbnailResourcesLayer } from '@foldkit-visuals/fluid/file-thumbnail'
import { makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { createReorderScope } from '@foldkit-visuals/fluid/reorder'
import type { InputFamilyConfig } from './input-family-owner.js'
import { InputFamilyExampleBlock, InputFamilyExampleLayer } from './input-family-owner.js'
import './selection-family.css'
import { homeRouter } from './input-family-routes'

const valuePolicies: ReadonlyArray<InputFamilyConfig['valuePolicy']> = [
  'accept',
  'ignore',
  'uppercase',
]

const sourcePreset = new URLSearchParams(window.location.search).get('preset') === 'source'

const files = createInputMessageFileRegistry()

const motion = createMotionScope('fluid-input-showcase')

const reorder = createReorderScope(motion)

const Model = Schema.Struct({ inputs: InputFamilyExampleBlock.Model })

const Message = defineMessageUnion({
  UpdatedPolicy: { value: Schema.Literals(['accept', 'ignore', 'uppercase']) },
  UpdatedStatus: { value: Schema.Literals(['idle', 'streaming']) },
  UpdatedVariant: { value: Schema.Literals(['icon', 'button']) },
})

export const InputShowcaseKey = Symbol('FluidInputShowcase')

const effects = Block.makeEffectsContract<
  never,
  Block.FactsOf<typeof InputFamilyExampleBlock>['programRequirements']
>()

const FluidInputShowcaseBlock = Block.make('FluidInputShowcase', {
  key: InputShowcaseKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const Inputs = FluidInputShowcaseBlock.makeRequiredFieldBinding(InputFamilyExampleBlock, {
  field: 'inputs',
  init: {
    contextToArgs: (): [InputFamilyConfig] => [
      {
        valuePolicy: 'accept',
        copy: { id: 'copy-command', value: 'npx shadcn@latest registry add @fluid' },
        message: {
          id: 'message-composer',
          value: '',
          reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          placeholderSuggestion: 'Why is every other input box so stiff?',
          suggestions: sourcePreset
            ? [
                'What is Fluid Functionalism about?',
                'How does Micka tune the springs behind these animations?',
                'Install the InputMessage component in my project',
                'Draft a short thank-you note to Micka for the library',
              ]
            : ['Summarize this conversation', 'Help me write an update'],
          history: ['Earlier draft'],
          supportsFiles: true,
          supportsQueue: true,
          supportsStop: true,
          status: 'idle',
        },
      },
    ],
  },
})

const FluidInputShowcaseComposition = FluidInputShowcaseBlock.makeComposition({
  bindings: [Inputs],
})

const init = FluidInputShowcaseComposition.makeInit(() => ({ model: {} }))

const update = FluidInputShowcaseComposition.makeUpdate({
  UpdatedStatus: FluidInputShowcaseBlock.makeStep.fromMessage(({ value }) =>
    Inputs.requestStatus({ status: value }),
  ),
  UpdatedPolicy: FluidInputShowcaseBlock.makeStep.fromMessage(({ value }) =>
    Inputs.requestPolicy({ policy: value }),
  ),
  UpdatedVariant: FluidInputShowcaseBlock.makeStep.fromMessage(({ value }) =>
    Inputs.requestCopyVariant({ variant: value }),
  ),
})

const view = FluidInputShowcaseComposition.makeView((model, h) => ({
  title: 'Fluid input family',
  body: h.main(
    [
      h.Class(
        'max-w-240 m-[0_auto] p-[40px_24px] [&_h1]:text-[26px] [&_h1]:mb-3 [&_section]:m-[28px_0] [&_h2]:text-[16px] [&_h2]:mb-3 [&_output]:block [&_output]:p-[12px_0] [&_output]:[color:var(--muted-foreground)]',
      ),
    ],
    [
      h.a([h.Href(homeRouter())], ['← All components']),
      h.h1([], ['Input family']),
      h.p([], ['Native clipboard feedback, controlled text, suggestions, files and tooltips.']),

      h.section(
        [],
        [
          h.h2([], ['Application acceptance']),
          h.div(
            [h.Class('flex gap-3')],
            valuePolicies.map((label) =>
              UiButton.view(
                {
                  onClick: Message.UpdatedPolicy({
                    value: label,
                  }),
                  type: 'button',
                  toView: (attributes) =>
                    h.button(
                      [...attributes.button, h.Class('border border-border rounded px-3 py-1')],
                      [label],
                    ),
                },
                h,
              ),
            ),
          ),
        ],
      ),
      h.block(
        Inputs.embedView({
          slotId: 'inputs',
          model: model.inputs,
          viewInputs: {
            getCopy: () => ({ className: 'w-[420px] max-w-full' }),
            getMessage: () => ({
              animate: motion.node,
              getReorder: () => reorder,
              className: sourcePreset ? 'w-[420px] max-w-full' : 'w-[440px] max-w-full',
              textareaLabel: 'Message',
              leftSlot: ({ context, filePickerAttributes }) => [
                Button(
                  {
                    variant: 'ghost',
                    buttonSize: 'icon-compact',
                    attributes: [
                      h.Type('button'),
                      h.AriaLabel('Attach files'),
                      ...filePickerAttributes(),
                    ],
                    context,
                    children: [context().icons.plus({ size: 14 }, h)],
                    ...examplePresentation,
                  },
                  h,
                ),
              ],
            }),
            getTooltip: () => ({ animate: motion.node, reducedMotion: 'user' as const }),
            renderInputs: (copy, message) =>
              h.div(
                [],
                [
                  h.section(
                    [],
                    [
                      h.h2([], ['Copy to clipboard']),
                      copy,
                      UiButton.view(
                        {
                          onClick: Message.UpdatedVariant({
                            value: model.inputs.copy.copy.variant === 'icon' ? 'button' : 'icon',
                          }),
                          type: 'button',
                          toView: (attributes) =>
                            h.button(
                              [
                                ...attributes.button,
                                h.Class('mt-3 border border-border rounded px-3 py-1'),
                              ],
                              ['Switch copy button style'],
                            ),
                        },
                        h,
                      ),
                    ],
                  ),
                  h.section([], [h.h2([], ['Message composer']), message]),
                ],
              ),
            renderDocument: (content, popups) => h.div([], [content, ...popups]),
            ...examplePresentation,
          },
        }),
      ),
      UiButton.view(
        {
          onClick: Message.UpdatedStatus({
            value:
              Option.getOrNull(model.inputs.message.status) === 'streaming' ? 'idle' : 'streaming',
          }),
          type: 'button',
          toView: (attributes) =>
            h.button(
              [...attributes.button, h.Class('border border-border rounded px-3 py-1')],
              [
                Option.getOrNull(model.inputs.message.status) === 'streaming'
                  ? 'Finish response'
                  : 'Start response',
              ],
            ),
        },
        h,
      ),
      h.output(
        [h.AriaLive('polite')],
        [
          `Copied ${model.inputs.copiedCount} times. Policy: ${model.inputs.valuePolicy}. Latest: ${model.inputs.messageEvents.at(-1)?._tag ?? 'none'}`,
        ],
      ),
    ],
  ),
}))

const ExampleLayer = FluidInputShowcaseBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(InputFamilyExampleLayer),
)

Runtime.run(
  Program.make({
    block: FluidInputShowcaseBlock,
    layer: ExampleLayer,
    container: document.querySelector<HTMLElement>('#root'),
  }).provide(
    Layer.mergeAll(
      motion.layer,
      reorder.layer,
      createInputCopyLayer(document, navigator, window),
      createInputMessageLayer(document, window, files),
      makeFileThumbnailResourcesLayer({ file: files.file }),
      makeTooltipDomLayer(document, window),
    ),
  ),
)
