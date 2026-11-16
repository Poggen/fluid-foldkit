import {
  InputGroupExampleBlock,
  InputGroupExampleLayer,
} from '../../../registry/fluid/examples/src/input-group-example-block'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion } from 'foldkit/message'
import {
  FormDocsBlock,
  FormDocsLayer,
  Config as FormConfig,
} from '../../../registry/fluid/examples/src/form-docs-block'
import {
  FieldDocsBlock,
  FieldDocsLayer,
  Config as FieldConfig,
} from '../../../registry/fluid/examples/src/field-docs-block'
import { ComponentPresentation } from '../settings'

const key = Symbol('AuthoredForms')
export const AuthoredFormsBlock = Block.make('AuthoredForms', {
  key,
  Model: Schema.Struct({
    forms: FormDocsBlock.Model,
    field: FieldDocsBlock.Model,
    group: InputGroupExampleBlock.Model,
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  InMessage: defineInMessageUnion({
    InformedOfPage: {
      slug: Schema.String,
      presentation: ComponentPresentation,
    },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof FormDocsBlock>['programRequirements']
    | Block.FactsOf<typeof FieldDocsBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{ readonly slug: string; readonly ready: boolean }>(),
  },
})
const Group = AuthoredFormsBlock.makeRequiredFieldBinding(InputGroupExampleBlock, {
  field: 'group',
})
const Forms = AuthoredFormsBlock.makeRequiredFieldBinding(FormDocsBlock, {
  field: 'forms',
  init: {
    contextToArgs: (): [typeof FormConfig.Type] => [
      { family: 'input', embedded: true, shape: 'sharp', size: 'default' },
    ],
  },
})
const Field = AuthoredFormsBlock.makeRequiredFieldBinding(FieldDocsBlock, {
  field: 'field',
  init: {
    contextToArgs: (): [typeof FieldConfig.Type] => [
      { embedded: true, shape: 'sharp', size: 'default', hoverMode: 'fluid' },
    ],
  },
})
const AuthoredFormsComposition = AuthoredFormsBlock.makeComposition({
  bindings: [Forms, Field, Group],
})
export const layer = AuthoredFormsBlock.makeLayer({
  init: AuthoredFormsComposition.makeInit(() => ({ model: {} })),
  update: AuthoredFormsComposition.makeUpdate({}),
  inMessageUpdate: AuthoredFormsComposition.makeInMessageUpdate({
    InformedOfPage: AuthoredFormsBlock.makeStep.fromMessage(({ slug, presentation: settings }) =>
      Update.combineSteps([
        Group.informOfDocumentation({
          embedded: true,
          shape: settings.shape,
          size: settings.size,
          hoverMode: settings.hover,
        }),
        Forms.informOfPresentation({
          family: slug === 'textarea' || slug === 'checkbox' ? slug : 'input',
          hoverMode: settings.hover,
          shape: settings.shape,
          size: settings.size,
        }),
        Field.informOfPresentation({
          shape: settings.shape,
          size: settings.size,
          hoverMode: settings.hover,
        }),
      ]),
    ),
  }),
  view: AuthoredFormsComposition.makeView.withInputs((model, { slug, ready }, h) =>
    !ready
      ? h.empty
      : slug === 'input-group'
        ? h.block(Group.embedView({ slotId: 'authored-input-group', model: model.group }))
        : slug === 'field'
          ? h.block(Field.embedView({ slotId: 'authored-field', model: model.field }))
          : slug === 'input' || slug === 'textarea' || slug === 'checkbox'
            ? h.block(Forms.embedView({ slotId: 'authored-forms', model: model.forms }))
            : h.empty,
  ),
}).pipe(Layer.provide(Layer.mergeAll(FormDocsLayer, FieldDocsLayer, InputGroupExampleLayer)))
