import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('ask-user-questions', {
  appearance: Appearance,
  label: Schema.String,
  type: Schema.Literals(['options', 'freeText']),
  layout: Schema.Literals(['inline', 'stacked']),
  chip: Schema.Literals(['right', 'left']),
  multiSelect: Schema.Boolean,
  allowOther: Schema.Boolean,
  multiline: Schema.Boolean,
  count: Schema.Literals([1, 2, 3]),
  skippable: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'ask-user-questions',
  appearance: {},
  label: 'How do you plan to use Fluid Functionalism?',
  type: 'options',
  layout: 'inline',
  chip: 'right',
  multiSelect: false,
  allowOther: false,
  multiline: true,
  count: 3,
  skippable: true,
})
export const controls = [
  {
    kind: 'text',
    prop: 'label',
    label: 'First question title',
    group: 'Question',
    initial: defaults.label,
    values: [defaults.label],
  },
  {
    kind: 'choice',
    prop: 'type',
    label: 'Type',
    group: 'Question',
    initial: defaults.type,
    values: Configuration.fields.type.literals,
  },
  {
    kind: 'choice',
    prop: 'layout',
    label: 'Layout',
    group: 'Question',
    initial: defaults.layout,
    values: Configuration.fields.layout.literals,
  },
  {
    kind: 'choice',
    prop: 'chip',
    label: 'Chip position',
    group: 'Question',
    initial: defaults.chip,
    values: Configuration.fields.chip.literals,
  },
  {
    kind: 'toggle',
    prop: 'multiSelect',
    label: 'Multi-select',
    group: 'Question',
    initial: defaults.multiSelect,
  },
  {
    kind: 'toggle',
    prop: 'allowOther',
    label: 'Allow other',
    group: 'Question',
    initial: defaults.allowOther,
  },
  {
    kind: 'toggle',
    prop: 'multiline',
    label: 'Multiline',
    group: 'Question',
    initial: defaults.multiline,
  },
  {
    kind: 'choice',
    prop: 'count',
    label: 'Questions',
    group: 'Flow',
    initial: defaults.count,
    values: Configuration.fields.count.literals,
  },
  {
    kind: 'toggle',
    prop: 'skippable',
    label: 'Skippable',
    group: 'Flow',
    initial: defaults.skippable,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor: (configuration: Configuration) => ReadonlyArray<Control> = (
  configuration: Configuration,
) =>
  controls.map((control) => ({
    ...control,
    enabled:
      control.prop === 'multiline'
        ? configuration.type === 'freeText'
        : ['label', 'layout', 'chip', 'multiSelect', 'allowOther'].includes(control.prop)
          ? configuration.type === 'options'
          : true,
  }))

/* @license Question fixtures derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
export const AUQ_OPTION_QUESTIONS = [
  {
    id: 'role',
    title: 'How do you plan to use Fluid Functionalism?',
    options: [
      {
        id: 'design',
        title: 'Designer',
        short: 'Prototyping flows and pages',
        long: 'Prototyping flows and pages fast, then handing the patterns to the team.',
      },
      {
        id: 'eng',
        title: 'Engineer',
        short: 'Shipping production UI',
        long: 'Shipping production UI with springs and tokens instead of hand-rolled CSS.',
      },
      {
        id: 'pm',
        title: 'PM',
        short: 'Aligning the team on patterns',
        long: 'Aligning the team on one set of interaction patterns everyone can point to.',
      },
      {
        id: 'founder',
        title: 'Founder',
        short: 'Bootstrapping a product',
        long: 'Bootstrapping a product that needs to look credible from day one.',
      },
    ],
  },
  {
    id: 'drew',
    title: 'What drew you to Fluid Functionalism?',
    options: [
      {
        id: 'motion',
        title: 'Motion',
        short: 'Springs that feel alive',
        long: 'Spring-driven motion that feels alive instead of scripted.',
      },
      {
        id: 'craft',
        title: 'Craft',
        short: 'Pixel-level polish',
        long: 'Pixel-level polish across typography, spacing, and focus states.',
      },
      {
        id: 'tokens',
        title: 'Tokens',
        short: 'Shape and elevation systems',
        long: 'Shape and elevation systems that compose beyond single components.',
      },
    ],
  },
  {
    id: 'recommend',
    title: 'Would you recommend Fluid Functionalism to a teammate?',
    options: [
      {
        id: 'yes',
        title: 'Yes',
        short: 'Already have',
        long: 'Already have — it sets the bar for polished React surfaces.',
      },
      {
        id: 'soon',
        title: 'Soon',
        short: 'Once it covers more ground',
        long: 'Once it covers more ground — a few primitives are still missing.',
      },
      {
        id: 'unsure',
        title: 'Not sure yet',
        short: 'Still evaluating',
        long: 'Still evaluating — one real flow will settle it.',
      },
    ],
  },
] as const

export const AUQ_FREE_TEXT_QUESTIONS = [
  {
    id: 'name',
    title: 'What should we call your workspace?',
    placeholder: 'e.g. Acme Design',
  },
  {
    id: 'goal',
    title: "Describe what you're hoping to build.",
    placeholder: 'A sentence or two is plenty…',
  },
  {
    id: 'feedback',
    title: "Anything else you'd like us to know?",
    placeholder: 'Type your answer…',
  },
] as const

export const AUQ_OTHER_PLACEHOLDER = 'Something else?'

export const buildQuestions = (configuration: Configuration) =>
  configuration.type === 'freeText'
    ? AUQ_FREE_TEXT_QUESTIONS.slice(0, configuration.count).map((question) => ({
        id: question.id,
        title: question.title,
        freeText: true,
        freeTextMultiline: configuration.multiline,
        freeTextPlaceholder: question.placeholder,
        skippable: configuration.skippable,
      }))
    : AUQ_OPTION_QUESTIONS.slice(0, configuration.count).map((question, index) => ({
        id: question.id,
        title: index === 0 ? configuration.label : question.title,
        layout: configuration.layout,
        chipPosition: configuration.chip,
        multiSelect: configuration.multiSelect,
        allowOther: configuration.allowOther,
        otherPlaceholder: AUQ_OTHER_PLACEHOLDER,
        skippable: configuration.skippable,
        options: question.options.map((option) => ({
          id: option.id,
          title: option.title,
          description: configuration.layout === 'stacked' ? option.long : option.short,
        })),
      }))
