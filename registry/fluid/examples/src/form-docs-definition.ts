import { previewCodeTabId } from '../../../../components/docs/preview-code-tabs.js'
import type { InputFileResources } from '@foldkit-visuals/fluid/input'

import { Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { HoverMode } from '@foldkit-visuals/fluid/hover'
import {
  hoverModeOf as controlsHoverModeOf,
  PreviewControlsBlock,
} from '../../../../components/docs/preview-controls'
import { initAndInsert } from 'foldkit/binding'

import { defineMessageUnion, defineInMessageUnion } from 'foldkit/message'

import { InputBlock } from '@foldkit-visuals/fluid/input'
import { TextareaBlock } from '@foldkit-visuals/fluid/textarea'
import { CheckboxBlock } from '@foldkit-visuals/fluid/checkbox'
import { FieldBlock } from '@foldkit-visuals/fluid/field'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'

export const Family = Schema.Literals(['input', 'textarea', 'checkbox'])

export const Config = Schema.Struct({
  family: Family,
  embedded: Schema.optional(Schema.Boolean),
  shape: Schema.Literals(['rounded', 'pill', 'sharp']),
  size: Schema.Literals(['default', 'compact']),
})

export const Model = Schema.Struct({
  isEmbedded: Schema.Boolean,
  docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  family: Family,
  shape: Config.fields.shape,
  size: Config.fields.size,
  email: InputBlock.Model,
  username: InputBlock.Model,
  invalidEmail: InputBlock.Model,
  workspace: InputBlock.Model,
  password: InputBlock.Model,
  seats: InputBlock.Model,
  attachment: InputBlock.Model,
  subscribe: InputBlock.Model,
  message: TextareaBlock.Model,
  feedback: TextareaBlock.Model,
  bio: TextareaBlock.Model,
  comment: TextareaBlock.Model,
  reply: TextareaBlock.Model,
  terms: CheckboxBlock.Model,
  updates: CheckboxBlock.Model,
  consent: CheckboxBlock.Model,
  locked: CheckboxBlock.Model,
  usernameField: FieldBlock.Model,
  invalidEmailField: FieldBlock.Model,
  feedbackField: FieldBlock.Model,
  bioField: FieldBlock.Model,
  updatesField: FieldBlock.Model,
  consentField: FieldBlock.Model,
  lockedField: FieldBlock.Model,
})

export const FormDocsKey = Symbol('FormDocs')

export const effects = Block.makeEffectsContract<never, InputFileResources>()

export const Message = defineMessageUnion({})
export const FormDocsBlock = Block.make('FormDocs', {
  key: FormDocsKey,
  Model,
  Message,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: {
      hoverMode: Schema.optionalKey(HoverMode),
      family: Family,
      shape: Config.fields.shape,
      size: Config.fields.size,
    },
  }),
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element' },
  effects,
})

export const emailControl = FormDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'email',
  init: { contextToArgs: () => [{ id: 'docs-email', value: '' }] },
})

export const email = emailControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      emailControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const usernameControl = FormDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'username',
  init: { contextToArgs: () => [{ id: 'docs-username', value: '' }] },
})

export const username = usernameControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      usernameControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const invalidEmailControl = FormDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'invalidEmail',
  init: { contextToArgs: () => [{ id: 'docs-invalidEmail', value: 'ada@anthropic' }] },
})

export const invalidEmail = invalidEmailControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      invalidEmailControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const workspaceControl = FormDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'workspace',
  init: { contextToArgs: () => [{ id: 'docs-workspace', value: '', disabled: true }] },
})

export const workspace = workspaceControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      workspaceControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const passwordControl = FormDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'password',
  init: { contextToArgs: () => [{ id: 'docs-password', value: '' }] },
})

export const password = passwordControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      passwordControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const seatsControl = FormDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'seats',
  init: { contextToArgs: () => [{ id: 'docs-seats', value: '' }] },
})

export const seats = seatsControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      seatsControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const attachmentControl = FormDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'attachment',
  init: { contextToArgs: () => [{ id: 'docs-attachment', value: '' }] },
})

export const attachment = attachmentControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      attachmentControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const subscribeControl = FormDocsBlock.makeRequiredFieldBinding(InputBlock, {
  field: 'subscribe',
  init: { contextToArgs: () => [{ id: 'docs-subscribe', value: '' }] },
})

export const subscribe = subscribeControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(InputBlock, {
    FilesChanged: () => FormDocsBlock.makeNoopStep(),
    Changed: ({ value }) =>
      subscribeControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const messageControl = FormDocsBlock.makeRequiredFieldBinding(TextareaBlock, {
  field: 'message',
  init: { contextToArgs: () => [{ id: 'docs-message', value: '' }] },
})

export const message = messageControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(TextareaBlock, {
    Changed: ({ value }) =>
      messageControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const feedbackControl = FormDocsBlock.makeRequiredFieldBinding(TextareaBlock, {
  field: 'feedback',
  init: { contextToArgs: () => [{ id: 'docs-feedback', value: '' }] },
})

export const feedback = feedbackControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(TextareaBlock, {
    Changed: ({ value }) =>
      feedbackControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const bioControl = FormDocsBlock.makeRequiredFieldBinding(TextareaBlock, {
  field: 'bio',
  init: { contextToArgs: () => [{ id: 'docs-bio', value: 'Hi' }] },
})

export const bio = bioControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(TextareaBlock, {
    Changed: ({ value }) =>
      bioControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const commentControl = FormDocsBlock.makeRequiredFieldBinding(TextareaBlock, {
  field: 'comment',
  init: { contextToArgs: () => [{ id: 'docs-comment', value: '', disabled: true }] },
})

export const comment = commentControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(TextareaBlock, {
    Changed: ({ value }) =>
      commentControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const replyControl = FormDocsBlock.makeRequiredFieldBinding(TextareaBlock, {
  field: 'reply',
  init: { contextToArgs: () => [{ id: 'docs-reply', value: '' }] },
})

export const reply = replyControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(TextareaBlock, {
    Changed: ({ value }) =>
      replyControl.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

export const termsControl = FormDocsBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'terms',
  init: { contextToArgs: () => [{ id: 'docs-terms', checked: false }] },
})

export const terms = termsControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      termsControl.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

export const updatesControl = FormDocsBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'updates',
  init: { contextToArgs: () => [{ id: 'docs-updates', checked: true }] },
})

export const updates = updatesControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      updatesControl.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

export const consentControl = FormDocsBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'consent',
  init: { contextToArgs: () => [{ id: 'docs-consent', checked: false }] },
})

export const consent = consentControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      consentControl.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

export const lockedControl = FormDocsBlock.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'locked',
  init: { contextToArgs: () => [{ id: 'docs-locked', checked: true, disabled: true }] },
})

export const locked = lockedControl.withOutMessagePolicy({
  fold: FormDocsBlock.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      lockedControl.requestConfigure({ checked, disabled: false, readOnly: false }),
  }),
})

export const usernameField = FormDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'usernameField',
  init: { contextToArgs: () => [{ id: 'docs-username-field' }] },
})

export const invalidEmailField = FormDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'invalidEmailField',
  init: { contextToArgs: () => [{ id: 'docs-invalidEmail-field' }] },
})

export const feedbackField = FormDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'feedbackField',
  init: { contextToArgs: () => [{ id: 'docs-feedback-field' }] },
})

export const bioField = FormDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'bioField',
  init: { contextToArgs: () => [{ id: 'docs-bio-field' }] },
})

export const updatesField = FormDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'updatesField',
  init: { contextToArgs: () => [{ id: 'docs-updates-field' }] },
})

export const consentField = FormDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'consentField',
  init: { contextToArgs: () => [{ id: 'docs-consent-field' }] },
})

export const lockedField = FormDocsBlock.makeRequiredFieldBinding(FieldBlock, {
  field: 'lockedField',
  init: { contextToArgs: () => [{ id: 'docs-locked-field' }] },
})

export const DocTabs = FormDocsBlock.makeRecordBinding(PreviewControlsBlock, { field: 'docTabs' })
const docSections = {
  input: ['Basic', 'With Field', 'Invalid', 'Disabled', 'Types', 'With a button'],
  textarea: ['Basic', 'With Field', 'Invalid', 'Disabled', 'With a button'],
  checkbox: ['Basic', 'With a description', 'Invalid and disabled'],
}

export const FormDocsComposition = FormDocsBlock.makeComposition({
  bindings: [
    DocTabs,
    email,
    username,
    invalidEmail,
    workspace,
    password,
    seats,
    attachment,
    subscribe,
    message,
    feedback,
    bio,
    comment,
    reply,
    terms,
    updates,
    consent,
    locked,
    usernameField,
    invalidEmailField,
    feedbackField,
    bioField,
    updatesField,
    consentField,
    lockedField,
  ],
})

export const init = FormDocsComposition.makeInit((config: typeof Config.Type) => ({
  model: {
    family: config.family,
    shape: config.shape,
    size: config.size,
    isEmbedded: config.embedded ?? false,
    docTabs: {},
  },
  steps: Object.entries(docSections).flatMap(([family, titles]) =>
    titles.map((title) =>
      FormDocsBlock.makeStep((model) =>
        initAndInsert(DocTabs, model, {
          key: `${family}:${title}`,
          args: [
            {
              id: previewCodeTabId('forms', `${family}:${title}`),
              idPrefix: previewCodeTabId('forms', `${family}:${title}`),
              selectedIndex: 0,
            },
          ],
        }),
      ),
    ),
  ),
}))

export const update = FormDocsComposition.makeUpdate({})
export const inMessageUpdate = FormDocsComposition.makeInMessageUpdate({
  InformedOfPresentation: FormDocsBlock.makeStep((model, { family, shape, size, hoverMode }) =>
    Update.combineSteps([
      FormDocsBlock.makeFieldsStep(() => ({
        family: () => family,
        shape: () => shape,
        size: () => size,
      })),
      ...Object.entries(model.docTabs).flatMap(([key, child]) =>
        hoverMode === undefined || controlsHoverModeOf(child) === hoverMode
          ? []
          : [DocTabs.requestHoverMode(key, { mode: hoverMode })],
      ),
    ]),
  ),
})

export const motion = createTargetMotionScope('form-docs')
