import { hoverModeOf as selectHoverModeOf } from '@foldkit-visuals/fluid/select'
import {
  hoverModeOf as controlsHoverModeOf,
  PreviewControlsBlock,
} from '../../../../components/docs/preview-controls'
import { modifyFields } from 'foldkit/struct'
import { previewCodeTabId } from '../../../../components/docs/preview-code-tabs.js'
import { HoverMode } from '@foldkit-visuals/fluid/hover'
import type { InputFileResources } from '@foldkit-visuals/fluid/input'
import type { DropdownResources } from '@foldkit-visuals/fluid/dropdown/environment'

import { Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'

import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { InputBlock } from '@foldkit-visuals/fluid/input'
import { TextareaBlock } from '@foldkit-visuals/fluid/textarea'
import { CheckboxBlock } from '@foldkit-visuals/fluid/checkbox'
import { SelectBlock } from '@foldkit-visuals/fluid/select'
import { FieldBlock } from '@foldkit-visuals/fluid/field'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'

import {
  Config,
  Model,
  stageOptions,
  departmentOptions,
  languageOptions,
  fieldDocSections,
} from './field-docs-contract.js'
export { Config, stageOptions, departmentOptions, languageOptions } from './field-docs-contract.js'

export const Message = defineMessageUnion({
  Submitted: {},
})

export const FieldDocsKey = Symbol('FieldDocs')

export const effects = Block.makeEffectsContract<never, DropdownResources | InputFileResources>()

export const FieldDocsBlock = Block.make('FieldDocs', {
  key: FieldDocsKey,
  Model,
  Message,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: {
      shape: Config.fields.shape,
      size: Config.fields.size,
      hoverMode: HoverMode,
    },
  }),
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element' },
  effects,
})

export const companyControl = FieldDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'company',
  init: { contextToArgs: () => [{ id: 'field-company', value: '' }] },
})

export const company = companyControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FieldDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      companyControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const contactControl = FieldDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'contact',
  init: { contextToArgs: () => [{ id: 'field-contact', value: '' }] },
})

export const contact = contactControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FieldDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      contactControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const notesControl = FieldDocsBlock.makeRequiredFieldBinding(TextareaBlock, {
  field: 'notes',
  init: { contextToArgs: () => [{ id: 'field-notes', value: '' }] },
})

export const notes = notesControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(TextareaBlock, {
    Changed: ({ value }) =>
      notesControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const conductControl = FieldDocsBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'conduct',
  init: { contextToArgs: () => [{ id: 'field-conduct', checked: false }] },
})

export const conduct = conductControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      conductControl.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

export const usernameControl = FieldDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'username',
  init: { contextToArgs: () => [{ id: 'field-username', value: '' }] },
})

export const username = usernameControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FieldDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      usernameControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const feedbackControl = FieldDocsBlock.makeRequiredFieldBinding(TextareaBlock, {
  field: 'feedback',
  init: { contextToArgs: () => [{ id: 'field-feedback', value: '' }] },
})

export const feedback = feedbackControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(TextareaBlock, {
    Changed: ({ value }) =>
      feedbackControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const repliesControl = FieldDocsBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'replies',
  init: { contextToArgs: () => [{ id: 'field-replies', checked: true }] },
})

export const replies = repliesControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      repliesControl.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

export const mentionsControl = FieldDocsBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'mentions',
  init: { contextToArgs: () => [{ id: 'field-mentions', checked: false }] },
})

export const mentions = mentionsControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      mentionsControl.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

export const kubeControl = FieldDocsBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'kube',
  init: { contextToArgs: () => [{ id: 'field-kube', checked: true }] },
})

export const kube = kubeControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      kubeControl.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

export const vmControl = FieldDocsBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'vm',
  init: { contextToArgs: () => [{ id: 'field-vm', checked: false }] },
})

export const vm = vmControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      vmControl.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

export const streetControl = FieldDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'street',
  init: { contextToArgs: () => [{ id: 'field-street', value: '' }] },
})

export const street = streetControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FieldDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      streetControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const cityControl = FieldDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'city',
  init: { contextToArgs: () => [{ id: 'field-city', value: '' }] },
})

export const city = cityControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FieldDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      cityControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const zipControl = FieldDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'zip',
  init: { contextToArgs: () => [{ id: 'field-zip', value: '' }] },
})

export const zip = zipControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FieldDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      zipControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const workEmailControl = FieldDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'workEmail',
  init: { contextToArgs: () => [{ id: 'field-workEmail', value: 'ada@anthropic' }] },
})

export const workEmail = workEmailControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FieldDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      workEmailControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const ssoControl = FieldDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'sso',
  init: { contextToArgs: () => [{ id: 'field-sso', value: '' }] },
})

export const sso = ssoControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FieldDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      ssoControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const stageControl = FieldDocsBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'stage',
  init: {
    contextToArgs: (config: typeof Config.Type) => [
      { id: 'field-stage', items: stageOptions, value: '', hoverMode: config.hoverMode },
    ],
  },
})

export const stage = stageControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) => stageControl.requestConfigure({ items: stageOptions, value }),
    OpenChanged: () => FieldDocsBlock.makeNoopStep(),
  }),
})

export const departmentControl = FieldDocsBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'department',
  init: {
    contextToArgs: (config: typeof Config.Type) => [
      { id: 'field-department', items: departmentOptions, value: '', hoverMode: config.hoverMode },
    ],
  },
})

export const department = departmentControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) =>
      departmentControl.requestConfigure({ items: departmentOptions, value }),
    OpenChanged: () => FieldDocsBlock.makeNoopStep(),
  }),
})

export const languageControl = FieldDocsBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'language',
  init: {
    contextToArgs: (config: typeof Config.Type) => [
      { id: 'field-language', items: languageOptions, value: 'en', hoverMode: config.hoverMode },
    ],
  },
})

export const language = languageControl.withOutMessagePolicy({
  fold: FieldDocsBlock.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) => languageControl.requestConfigure({ items: languageOptions, value }),
    OpenChanged: () => FieldDocsBlock.makeNoopStep(),
  }),
})

export const companyField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'companyField',
  init: { contextToArgs: () => [{ id: 'field-company-group' }] },
})

export const contactField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'contactField',
  init: { contextToArgs: () => [{ id: 'field-contact-group' }] },
})

export const notesField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'notesField',
  init: { contextToArgs: () => [{ id: 'field-notes-group' }] },
})

export const conductField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'conductField',
  init: { contextToArgs: () => [{ id: 'field-conduct-group' }] },
})

export const usernameField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'usernameField',
  init: { contextToArgs: () => [{ id: 'field-username-group' }] },
})

export const feedbackField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'feedbackField',
  init: { contextToArgs: () => [{ id: 'field-feedback-group' }] },
})

export const repliesField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'repliesField',
  init: { contextToArgs: () => [{ id: 'field-replies-group' }] },
})

export const mentionsField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'mentionsField',
  init: { contextToArgs: () => [{ id: 'field-mentions-group' }] },
})

export const kubeField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'kubeField',
  init: { contextToArgs: () => [{ id: 'field-kube-group' }] },
})

export const vmField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'vmField',
  init: { contextToArgs: () => [{ id: 'field-vm-group' }] },
})

export const streetField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'streetField',
  init: { contextToArgs: () => [{ id: 'field-street-group' }] },
})

export const cityField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'cityField',
  init: { contextToArgs: () => [{ id: 'field-city-group' }] },
})

export const zipField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'zipField',
  init: { contextToArgs: () => [{ id: 'field-zip-group' }] },
})

export const workEmailField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'workEmailField',
  init: { contextToArgs: () => [{ id: 'field-workEmail-group' }] },
})

export const ssoField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'ssoField',
  init: { contextToArgs: () => [{ id: 'field-sso-group' }] },
})

export const stageField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'stageField',
  init: { contextToArgs: () => [{ id: 'field-stage-group' }] },
})

export const departmentField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'departmentField',
  init: { contextToArgs: () => [{ id: 'field-department-group' }] },
})

export const languageField = FieldDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'languageField',
  init: { contextToArgs: () => [{ id: 'field-language-group' }] },
})

export const DocTabs = FieldDocsBlock.makeRecordBinding(PreviewControlsBlock, { field: 'docTabs' })

export const FieldDocsComposition = FieldDocsBlock.makeComposition({
  bindings: [
    DocTabs,
    company,
    contact,
    notes,
    conduct,
    username,
    feedback,
    replies,
    mentions,
    kube,
    vm,
    street,
    city,
    zip,
    workEmail,
    sso,
    stage,
    department,
    language,
    companyField,
    contactField,
    notesField,
    conductField,
    usernameField,
    feedbackField,
    repliesField,
    mentionsField,
    kubeField,
    vmField,
    streetField,
    cityField,
    zipField,
    workEmailField,
    ssoField,
    stageField,
    departmentField,
    languageField,
  ],
})

export const init = FieldDocsComposition.makeInit((config: typeof Config.Type) => ({
  childInitContext: config,
  model: {
    isEmbedded: config.embedded ?? false,
    docTabs: {},
    shape: config.shape,
    size: config.size,
    errors: {},
    isSent: false,
  },
  steps: fieldDocSections.map((title) =>
    FieldDocsBlock.makeStep((model) =>
      initAndInsert(DocTabs, model, {
        key: title,
        args: [
          {
            id: previewCodeTabId('field', title),
            idPrefix: previewCodeTabId('field', title),
            selectedIndex: 0,
          },
        ],
      }),
    ),
  ),
}))

export const update = FieldDocsComposition.makeUpdate({
  Submitted: (model) => {
    const errors: Record<string, string> = {}

    if (!model.company.value.trim()) {
      errors.company = 'Company is required'
    }

    const email = model.contact.value.trim()

    if (!email) {
      errors.email = 'Work email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
      errors.email = 'Enter a valid email address'
    }

    if (!model.conduct.checked) {
      errors.conduct = 'Required to join the event'
    }

    return {
      model: modifyFields(model, {
        errors: () => errors,
        isSent: () => Object.keys(errors).length === 0,
      }),
    }
  },
})

export const inMessageUpdate = FieldDocsComposition.makeInMessageUpdate({
  InformedOfPresentation: FieldDocsBlock.makeStep((model, { shape, size, hoverMode }) =>
    Update.combineSteps([
      FieldDocsBlock.makeFieldsStep(() => ({ shape: () => shape, size: () => size })),

      ...Object.entries(model.docTabs).flatMap(([key, child]) =>
        controlsHoverModeOf(child) === hoverMode
          ? []
          : [DocTabs.requestHoverMode(key, { mode: hoverMode })],
      ),
      FieldDocsBlock.makeStep((current) =>
        selectHoverModeOf(current.stage) === hoverMode
          ? { model: current }
          : stage.requestHoverMode({ mode: hoverMode }),
      ),
      FieldDocsBlock.makeStep((current) =>
        selectHoverModeOf(current.department) === hoverMode
          ? { model: current }
          : department.requestHoverMode({ mode: hoverMode }),
      ),
      FieldDocsBlock.makeStep((current) =>
        selectHoverModeOf(current.language) === hoverMode
          ? { model: current }
          : language.requestHoverMode({ mode: hoverMode }),
      ),
    ]),
  ),
})

export const motion = createTargetMotionScope('field-docs')

export type FieldDocsHtml = Parameters<Parameters<typeof FieldDocsComposition.makeView>[0]>[1]
