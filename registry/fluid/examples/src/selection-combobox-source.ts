import { examplePresentation } from './example-presentation.js'
import type { DialogResources } from '@foldkit-visuals/fluid/dialog'
import { selectionFamilyRouter } from './selection-family-routes.js'
import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  ComboboxBlock,
  layer as ComboboxLayer,
  createComboboxLayer,
} from '@foldkit-visuals/fluid/combobox'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'

const items = [
  'Accordion',
  'Badge',
  'Button',
  'Card',
  'CheckboxGroup',
  'ColorPicker',
  'Combobox',
  'Dialog',
  'Dropdown',
  'InputGroup',
  'RadioGroup',
  'Select',
  'Sidebar',
  'Slider',
  'Switch',
  'Table',
  'Tabs',
].map((label) => ({
  label,
  value: label.replaceAll(/(?<lower>[a-z])(?<upper>[A-Z])/gu, '$<lower>-$<upper>').toLowerCase(),
}))

const context = createPresentationContext({ reducedMotion: 'user', ...examplePresentation })

const Model = Schema.Struct({
  combobox: ComboboxBlock.Model,
  values: Schema.Array(Schema.String),
})

const Message = defineMessageUnion({})

const effects = Block.makeEffectsContract<never, DialogResources>()

export const SourceComboboxKey = Symbol('SourceCombobox')

export const SourceComboboxBlock = Block.make('SourceCombobox', {
  key: SourceComboboxKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const Component = ComboboxBlock

const Definition = SourceComboboxBlock

const sourceComboboxLayer = () =>
  Layer.unwrap(
    Effect.sync(() => {
      const motion = createMotionScope('fluid-combobox-source')

      const RawCombobox = Definition.makeRequiredFieldBinding(Component, {
        field: 'combobox',
        init: {
          contextToArgs: () => [
            {
              id: 'source-components',

              items,
              multiple: true,
              value: ['button', 'combobox'],
            },
          ],
        },
      })

      const Combobox = RawCombobox.withOutMessagePolicy({
        fold: Definition.makeOutMessageFold(Component, {
          ValuesChanged: ({ values }) =>
            Update.combineSteps([
              Definition.makeFieldsStep(() => ({ values: () => values })),
              RawCombobox.requestConfigure({ items, value: values }),
            ]),
          Selected: Definition.makeNoopStep,
          CreateRequested: Definition.makeNoopStep,
        }),
      })

      const Composition = Definition.makeComposition({ bindings: [Combobox] })

      const init = Composition.makeInit(() => ({
        model: { values: ['button', 'combobox'] },
      }))

      const update = Composition.makeUpdate({})

      const view = Composition.makeView((model, h) => {
        return {
          title: 'Fluid Combobox',
          body: h.main(
            [
              h.Class(
                'max-w-240 m-[0_auto] p-[40px_24px] [&_h1]:text-[26px] [&_h1]:mb-3 [&_section]:m-[28px_0] [&_h2]:text-[16px] [&_h2]:mb-3 [&_output]:block [&_output]:p-[12px_0] [&_output]:[color:var(--muted-foreground)]',
              ),
            ],
            [
              h.a([h.Href(selectionFamilyRouter({}))], ['← All selection examples']),
              h.h1([], ['Combobox']),
              h.section(
                [],
                [
                  h.block(
                    Combobox.embedView({
                      slotId: model.combobox.id,
                      model: model.combobox,
                      viewInputs: {
                        context,
                        placeholder: 'Add components…',
                        className: 'w-[280px] max-w-full',
                        animate: motion.node,
                        ...examplePresentation,
                      },
                    }),
                  ),
                ],
              ),
            ],
          ),
        }
      })

      const implementation = { init, update, view }

      return SourceComboboxBlock.makeLayer<typeof implementation>(implementation).pipe(
        Layer.provide(ComboboxLayer),
        Layer.provideMerge(motion.layer),
      )
    }),
  )

export const comboboxSourceProgram = (container: HTMLElement | null) =>
  Program.make({
    block: SourceComboboxBlock,
    layer: sourceComboboxLayer(),
    container,
  }).provide({ services: createComboboxLayer(document) })
