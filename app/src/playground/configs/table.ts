import { Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('table', {
  appearance: Appearance,
  size: Schema.Literals(['site', 'default', 'compact']),
  rowCount: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 4 })),
  columnCount: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 3 })),
  showHeader: Schema.Boolean,
  headers: Schema.String,
  firstCell: Schema.String,
  emptyTitle: Schema.String,
  emptyDescription: Schema.String,
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'table',
  appearance: {},
  size: 'site',
  rowCount: 4,
  columnCount: 3,
  showHeader: true,
  headers: 'Name, Status, Updated',
  firstCell: 'Design system',
  emptyTitle: 'No records',
  emptyDescription: 'Add a record to get started.',
})
export const controls = [
  {
    kind: 'choice',
    prop: 'size',
    group: 'Appearance',
    initial: defaults.size,
    values: Configuration.fields.size.literals,
  },
  {
    kind: 'number',
    prop: 'rowCount',
    group: 'Properties',
    initial: defaults.rowCount,
    min: 0,
    max: 4,
    step: 1,
  },
  {
    kind: 'number',
    prop: 'columnCount',
    group: 'Properties',
    initial: defaults.columnCount,
    min: 1,
    max: 3,
    step: 1,
  },
  { kind: 'toggle', prop: 'showHeader', group: 'Content', initial: defaults.showHeader },
  {
    kind: 'text',
    prop: 'headers',
    group: 'Content',
    initial: defaults.headers,
    values: [defaults.headers],
  },
  {
    kind: 'text',
    prop: 'firstCell',
    group: 'Content',
    initial: defaults.firstCell,
    values: [defaults.firstCell],
  },
  {
    kind: 'text',
    prop: 'emptyTitle',
    group: 'Content',
    initial: defaults.emptyTitle,
    values: [defaults.emptyTitle],
  },
  {
    kind: 'text',
    prop: 'emptyDescription',
    group: 'Content',
    initial: defaults.emptyDescription,
    values: [defaults.emptyDescription],
  },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (configuration: Configuration): ReadonlyArray<Control> =>
  controls.map((control) => {
    if (control.prop === 'headers') return { ...control, enabled: configuration.showHeader }
    if (control.prop === 'firstCell') return { ...control, enabled: configuration.rowCount > 0 }
    if (control.prop === 'emptyTitle') return { ...control, enabled: configuration.rowCount === 0 }
    if (control.prop === 'emptyDescription')
      return { ...control, enabled: configuration.rowCount === 0 }
    return control
  })
