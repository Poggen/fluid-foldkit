import { Schema } from 'effect'
import { HoverMode } from '@foldkit-visuals/fluid/hover'
import { InputBlock } from '@foldkit-visuals/fluid/input'
import { TextareaBlock } from '@foldkit-visuals/fluid/textarea'
import { CheckboxBlock } from '@foldkit-visuals/fluid/checkbox'
import { SelectBlock } from '@foldkit-visuals/fluid/select'
import { FieldBlock } from '@foldkit-visuals/fluid/field'
import { PreviewControlsBlock } from '../../../../components/docs/preview-controls'

export const Config = Schema.Struct({
  embedded: Schema.optional(Schema.Boolean),
  shape: Schema.Literals(['rounded', 'pill', 'sharp']),
  size: Schema.Literals(['default', 'compact']),
  hoverMode: HoverMode,
})

export const Model = Schema.Struct({
  isEmbedded: Schema.Boolean,
  docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  errors: Schema.Record(Schema.String, Schema.String),
  isSent: Schema.Boolean,
  shape: Config.fields.shape,
  size: Config.fields.size,
  company: InputBlock.Model,
  contact: InputBlock.Model,
  notes: TextareaBlock.Model,
  conduct: CheckboxBlock.Model,
  username: InputBlock.Model,
  feedback: TextareaBlock.Model,
  replies: CheckboxBlock.Model,
  mentions: CheckboxBlock.Model,
  kube: CheckboxBlock.Model,
  vm: CheckboxBlock.Model,
  street: InputBlock.Model,
  city: InputBlock.Model,
  zip: InputBlock.Model,
  workEmail: InputBlock.Model,
  sso: InputBlock.Model,
  stage: SelectBlock.Model,
  department: SelectBlock.Model,
  language: SelectBlock.Model,
  companyField: FieldBlock.Model,
  contactField: FieldBlock.Model,
  notesField: FieldBlock.Model,
  conductField: FieldBlock.Model,
  usernameField: FieldBlock.Model,
  feedbackField: FieldBlock.Model,
  repliesField: FieldBlock.Model,
  mentionsField: FieldBlock.Model,
  kubeField: FieldBlock.Model,
  vmField: FieldBlock.Model,
  streetField: FieldBlock.Model,
  cityField: FieldBlock.Model,
  zipField: FieldBlock.Model,
  workEmailField: FieldBlock.Model,
  ssoField: FieldBlock.Model,
  stageField: FieldBlock.Model,
  departmentField: FieldBlock.Model,
  languageField: FieldBlock.Model,
})

export const stageOptions = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Public'].map(
  (value) => ({ value, label: value }),
)

export const departmentOptions = [
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'research', label: 'Research' },
]

export const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

export const fieldDocSections = [
  'Form',
  'Input',
  'Textarea',
  'Select',
  'Checkbox',
  'Choice card',
  'Fieldset',
  'Validation and errors',
  'Horizontal',
  'Separator',
]
