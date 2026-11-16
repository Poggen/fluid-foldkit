import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('thinking-steps', {
  appearance: Appearance,
  label: Schema.String,
  count: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 4 })),
  stepLabel: Schema.String,
  stepDescription: Schema.String,
  status: Schema.Literals(['complete', 'active', 'pending']),
  showIcons: Schema.Boolean,
  open: Schema.Boolean,
  disabled: Schema.Boolean,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'thinking-steps',
  appearance: {},
  label: 'Thinking through the details',
  count: 4,
  stepLabel: 'Searching profiles',
  stepDescription: 'Reviewing the available sources',
  status: 'complete',
  showIcons: true,
  open: true,
  disabled: false,
  size: 'site',
})
export const controls = [
  {
    kind: 'text',
    prop: 'label',
    group: 'Content',
    initial: defaults.label,
    values: [defaults.label],
  },
  {
    kind: 'number',
    prop: 'count',
    group: 'Properties',
    initial: defaults.count,
    min: 1,
    max: 4,
    step: 1,
  },
  {
    kind: 'text',
    prop: 'stepLabel',
    group: 'Content',
    initial: defaults.stepLabel,
    values: [defaults.stepLabel],
  },
  {
    kind: 'text',
    prop: 'stepDescription',
    group: 'Content',
    initial: defaults.stepDescription,
    values: [defaults.stepDescription],
  },
  {
    kind: 'choice',
    prop: 'status',
    group: 'State',
    initial: defaults.status,
    values: Configuration.fields.status.literals,
  },
  { kind: 'toggle', prop: 'showIcons', group: 'Appearance', initial: defaults.showIcons },
  { kind: 'toggle', prop: 'open', group: 'State', initial: defaults.open },
  { kind: 'toggle', prop: 'disabled', group: 'State', initial: defaults.disabled },
  {
    kind: 'choice',
    prop: 'size',
    group: 'Appearance',
    initial: defaults.size,
    values: Configuration.fields.size.literals,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (_configuration: Configuration): ReadonlyArray<Control> => controls
