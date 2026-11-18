import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('accordion', {
  appearance: Appearance,
  expand: Schema.Literals(['one', 'oneOrNone', 'any']),
  highlightExpanded: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'accordion',
  appearance: {},
  expand: 'oneOrNone',
  highlightExpanded: true,
})
export const controls = [
  {
    kind: 'choice',
    prop: 'expand',
    values: Configuration.fields.expand.literals,
    initial: defaults.expand,
  },
  {
    kind: 'toggle',
    prop: 'highlightExpanded',
    initial: defaults.highlightExpanded,
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>

export const controlsFor: (_configuration: Configuration) => ReadonlyArray<Control> = (
  _configuration: Configuration,
) => controls
