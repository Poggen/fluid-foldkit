import { Button } from '@foldkit/ui'
import type { InputFileResources } from '@foldkit-visuals/fluid/input'
import { childAttributes } from 'foldkit/html'
import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { InputBlock, layer as InputLayer } from '@foldkit-visuals/fluid/input'
import { TextareaBlock, layer as TextareaLayer } from '@foldkit-visuals/fluid/textarea'
import { CheckboxBlock, layer as CheckboxLayer } from '@foldkit-visuals/fluid/checkbox'
import {
  FieldBlock,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldContent,
  FieldTitle,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldSeparator,
  layer as FieldLayer,
} from '@foldkit-visuals/fluid/field'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'

const Model = Schema.Struct({
  name: InputBlock.Model,
  amount: InputBlock.Model,
  upload: InputBlock.Model,
  notes: TextareaBlock.Model,
  choice: CheckboxBlock.Model,
  plain: CheckboxBlock.Model,
  nameField: FieldBlock.Model,
  notesField: FieldBlock.Model,
  choiceField: FieldBlock.Model,
})

export const FormsExampleKey = Symbol('FormsExample')

const effects = Block.makeEffectsContract<never, InputFileResources>()

export const FormsExampleBlock = Block.make('FormsExample', {
  key: FormsExampleKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects,
})

const NameBinding = FormsExampleBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'name',
  init: { contextToArgs: () => [{ id: 'form-name', value: '' }] },
})

const Name = NameBinding.withOutMessagePolicy({
  fold: FormsExampleBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormsExampleBlock.makeNoopStep(),
    Changed: ({ value }) =>
      NameBinding.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

const AmountBinding = FormsExampleBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'amount',
  init: { contextToArgs: () => [{ id: 'form-amount', value: '2' }] },
})

const Amount = AmountBinding.withOutMessagePolicy({
  fold: FormsExampleBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormsExampleBlock.makeNoopStep(),
    Changed: ({ value }) =>
      AmountBinding.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

const UploadBinding = FormsExampleBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'upload',
  init: { contextToArgs: () => [{ id: 'form-upload', value: '' }] },
})

const Upload = UploadBinding.withOutMessagePolicy({
  fold: FormsExampleBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormsExampleBlock.makeNoopStep(),
    Changed: ({ value }) =>
      UploadBinding.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

const NotesBinding = FormsExampleBlock.makeRequiredFieldBinding(TextareaBlock, {
  field: 'notes',
  init: { contextToArgs: () => [{ id: 'form-notes', value: '' }] },
})

const Notes = NotesBinding.withOutMessagePolicy({
  fold: FormsExampleBlock.makeOutMessageFold(TextareaBlock, {
    Changed: ({ value }) =>
      NotesBinding.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

const ChoiceBinding = FormsExampleBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'choice',
  init: { contextToArgs: () => [{ id: 'form-choice', checked: true }] },
})

const Choice = ChoiceBinding.withOutMessagePolicy({
  fold: FormsExampleBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      ChoiceBinding.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

const PlainBinding = FormsExampleBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'plain',
  init: { contextToArgs: () => [{ id: 'form-plain', checked: false }] },
})

const Plain = PlainBinding.withOutMessagePolicy({
  fold: FormsExampleBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      PlainBinding.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

const NameFieldBinding = FormsExampleBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'nameField',
  init: { contextToArgs: () => [{ id: 'name-field' }] },
})

const NameField = NameFieldBinding

const NotesFieldBinding = FormsExampleBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'notesField',
  init: { contextToArgs: () => [{ id: 'notes-field' }] },
})

const NotesField = NotesFieldBinding

const ChoiceFieldBinding = FormsExampleBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'choiceField',
  init: { contextToArgs: () => [{ id: 'choice-field' }] },
})

const ChoiceField = ChoiceFieldBinding

const FormsExampleComposition = FormsExampleBlock.makeComposition({
  bindings: [Name, Amount, Upload, Notes, Choice, Plain, NameField, NotesField, ChoiceField],
})

const init = FormsExampleComposition.makeInit(() => ({ model: {} }))

const update = FormsExampleComposition.makeUpdate({})

export const target = createTargetMotionScope('forms')

const view = FormsExampleComposition.makeView((model, h) =>
  h.main(
    [h.Class('mx-auto flex max-w-xl flex-col gap-6 p-8')],
    [
      h.h1([h.Class('text-xl')], ['Forms']),
      h.form(
        [h.Id('forms-example')],
        [
          FieldSet(
            {
              children: [
                FieldLegend({ children: ['Your profile'] }, h),
                FieldGroup(
                  {
                    children: [
                      h.block(
                        NameField.embedView({
                          slotId: 'name-field',
                          model: model.nameField,
                          viewInputs: {
                            content: () => [
                              FieldLabel({ htmlFor: 'form-name', children: ['Display name'] }, h),
                              h.block(
                                Name.embedView({
                                  slotId: 'form-name',
                                  model: model.name,
                                  viewInputs: {
                                    placeholder: 'Ada Lovelace',
                                    attributes: childAttributes([h.Required(true), h.Name('name')]),
                                  },
                                }),
                              ),
                              FieldDescription(
                                { children: ['This appears on your public profile.'] },
                                h,
                              ),
                            ],
                          },
                        }),
                      ),
                      h.block(
                        NotesField.embedView({
                          slotId: 'notes-field',
                          model: model.notesField,
                          viewInputs: {
                            content: () => [
                              FieldLabel({ htmlFor: 'form-notes', children: ['About you'] }, h),
                              h.block(
                                Notes.embedView({
                                  slotId: 'form-notes',
                                  model: model.notes,
                                  viewInputs: {
                                    placeholder: 'Tell us a little about yourself.',
                                    name: 'notes',
                                  },
                                }),
                              ),
                              FieldDescription(
                                { children: ['Three lines to start; room for ten.'] },
                                h,
                              ),
                            ],
                          },
                        }),
                      ),
                      FieldLabel(
                        {
                          children: [
                            h.block(
                              ChoiceField.embedView({
                                slotId: 'choice-field',
                                model: model.choiceField,
                                viewInputs: {
                                  orientation: 'horizontal',
                                  content: () => [
                                    h.block(
                                      Choice.embedView({
                                        slotId: 'form-choice',
                                        model: model.choice,
                                        viewInputs: { name: 'updates', animate: target.node },
                                      }),
                                    ),
                                    FieldContent(
                                      {
                                        children: [
                                          FieldTitle({ children: ['Product updates'] }, h),
                                          FieldDescription(
                                            { children: ['Occasional news about new features.'] },
                                            h,
                                          ),
                                        ],
                                      },
                                      h,
                                    ),
                                  ],
                                },
                              }),
                            ),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                FieldSeparator({ children: ['Native controls'] }, h),
                FieldLabel({ htmlFor: 'form-amount', children: ['Seats'] }, h),
                h.block(
                  Amount.embedView({
                    slotId: 'form-amount',
                    model: model.amount,
                    viewInputs: {
                      type: 'number',
                      attributes: childAttributes([h.Min('1'), h.Max('10'), h.Step('any')]),
                    },
                  }),
                ),
                FieldLabel({ htmlFor: 'form-upload', children: ['Avatar'] }, h),
                h.block(
                  Upload.embedView({
                    slotId: 'form-upload',
                    model: model.upload,
                    viewInputs: { type: 'file', name: 'avatar' },
                  }),
                ),
                h.div(
                  [h.Class('flex items-center gap-2')],
                  [
                    h.block(
                      Plain.embedView({
                        slotId: 'form-plain',
                        model: model.plain,
                        viewInputs: {
                          label: 'Accept terms',
                          required: true,
                          name: 'terms',
                          animate: target.node,
                        },
                      }),
                    ),
                    FieldLabel({ htmlFor: 'form-plain', children: ['Accept terms'] }, h),
                  ],
                ),
                FieldError(
                  {
                    errors: [
                      { message: 'Please review the required fields.' },
                      { message: 'Please review the required fields.' },
                    ],
                  },
                  h,
                ),
                Button.view(
                  {
                    type: 'reset',
                    toView: (attributes) =>
                      h.button(
                        [...attributes.button, h.Class('text-muted-foreground')],
                        ['Reset form'],
                      ),
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      ),
    ],
  ),
)

export const FormsExampleLayer = FormsExampleBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.mergeAll(InputLayer, TextareaLayer, CheckboxLayer, FieldLayer)),
)
