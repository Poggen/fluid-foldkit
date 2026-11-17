import { Effect, Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

const SelectionMode = Schema.Literals(['none', 'first', 'run', 'disjoint'])

export const Configuration = Schema.TaggedStruct('table', {
  appearance: Appearance,
  size: Schema.Literals(['site', 'default', 'compact']),
  rowCount: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 4 })),
  columnCount: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 3 })),
  showHeader: Schema.Boolean,
  selection: SelectionMode.pipe(Schema.withDecodingDefaultKey(Effect.succeed('none'))),
  headerHover: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  heldHeader: Schema.Int.check(Schema.isBetween({ minimum: -1, maximum: 2 })).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(-1)),
  ),
  hideHeaderHighlight: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  keepHeaderRule: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  hoverMarker: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
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
  selection: 'none',
  headerHover: false,
  heldHeader: -1,
  hideHeaderHighlight: false,
  keepHeaderRule: false,
  hoverMarker: false,
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
  {
    kind: 'choice',
    prop: 'selection',
    group: 'State',
    initial: defaults.selection,
    values: SelectionMode.literals,
  },
  { kind: 'toggle', prop: 'headerHover', group: 'State', initial: defaults.headerHover },
  {
    kind: 'number',
    prop: 'heldHeader',
    group: 'State',
    initial: defaults.heldHeader,
    min: -1,
    max: 2,
    step: 1,
  },
  {
    kind: 'toggle',
    prop: 'hideHeaderHighlight',
    group: 'State',
    initial: defaults.hideHeaderHighlight,
  },
  { kind: 'toggle', prop: 'keepHeaderRule', group: 'State', initial: defaults.keepHeaderRule },
  { kind: 'toggle', prop: 'hoverMarker', group: 'State', initial: defaults.hoverMarker },
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

export const selectedIndices = (configuration: Configuration) => {
  const indices = { none: [], first: [0], run: [0, 1, 2], disjoint: [0, 2] }[
    configuration.selection
  ]
  return indices.filter((index) => index < configuration.rowCount)
}
