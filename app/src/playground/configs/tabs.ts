import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('tabs', {
  appearance: Appearance,
  labels: Schema.String,
  count: Schema.Int.check(Schema.isBetween({ minimum: 2, maximum: 5 })),
  showIcons: Schema.Boolean,
  activeLabel: Schema.Boolean,
  disabled: Schema.Boolean,
  size: Schema.Literals(['site', 'default', 'compact']),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'tabs',
  appearance: {},
  labels: 'Home, Chat, Inbox',
  count: 3,
  showIcons: true,
  activeLabel: true,
  disabled: false,
  size: 'site',
})
export const controls = [
  {
    kind: 'text',
    prop: 'labels',
    group: 'Content',
    initial: defaults.labels,
    values: [defaults.labels],
  },
  {
    kind: 'number',
    prop: 'count',
    group: 'Properties',
    initial: defaults.count,
    min: 2,
    max: 5,
    step: 1,
  },
  { kind: 'toggle', prop: 'showIcons', group: 'Content', initial: defaults.showIcons },
  { kind: 'toggle', prop: 'activeLabel', group: 'Appearance', initial: defaults.activeLabel },
  { kind: 'toggle', prop: 'disabled', group: 'State', initial: defaults.disabled },
  {
    kind: 'choice',
    prop: 'size',
    group: 'Appearance',
    initial: defaults.size,
    values: Configuration.fields.size.literals,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor: (_configuration: Configuration) => ReadonlyArray<Control> = (
  _configuration: Configuration,
) => controls
