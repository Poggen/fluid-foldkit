import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('code-block', {
  appearance: Appearance,
  language: Schema.String,
  title: Schema.String,
  code: Schema.String,
  lineNumbers: Schema.Boolean,
  wrap: Schema.Boolean,
  hideHeader: Schema.Boolean,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'code-block',
  appearance: {},
  language: 'typescript',
  title: 'hello.ts',
  code: "const greeting = 'Hello, Fluid'\nconsole.log(greeting)",
  lineNumbers: true,
  wrap: false,
  hideHeader: false,
})
export const controls = [
  {
    kind: 'text',
    prop: 'language',
    group: 'Content',
    initial: defaults.language,
    values: [defaults.language],
  },
  {
    kind: 'text',
    prop: 'title',
    group: 'Content',
    initial: defaults.title,
    values: [defaults.title],
  },
  { kind: 'text', prop: 'code', group: 'Content', initial: defaults.code, values: [defaults.code] },
  { kind: 'toggle', prop: 'lineNumbers', group: 'Properties', initial: defaults.lineNumbers },
  { kind: 'toggle', prop: 'wrap', group: 'Properties', initial: defaults.wrap },
  { kind: 'toggle', prop: 'hideHeader', group: 'Properties', initial: defaults.hideHeader },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (_configuration: Configuration): ReadonlyArray<Control> => controls
