import { Effect, Schema } from 'effect'
import type { Control } from '../control-definition'
import { Appearance } from './presentation'

export const Configuration = Schema.TaggedStruct('data-table', {
  appearance: Appearance,
  title: Schema.String.pipe(Schema.withDecodingDefaultKey(Effect.succeed('Components'))),
  showTitle: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  search: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  searchMode: Schema.Literals(['all', 'name']).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed('all')),
  ),
  filters: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  savedViews: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  viewOptions: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  resizableColumns: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  reorderColumns: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  selectable: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  rowReorder: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  editable: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  wrap: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  cellAlignment: Schema.Literals(['auto', 'center', 'top']).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed('auto')),
  ),
  pagination: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  pageSize: Schema.Literals([5, 10, 20, 30, 50]).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(10)),
  ),
  selectionBar: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(true))),
  loading: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  empty: Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
})
export type Configuration = typeof Configuration.Type
export const defaults: Configuration = Configuration.make({
  _tag: 'data-table',
  appearance: {},
  title: 'Components',
  showTitle: true,
  search: true,
  searchMode: 'all',
  filters: true,
  savedViews: true,
  viewOptions: true,
  resizableColumns: true,
  reorderColumns: true,
  selectable: true,
  rowReorder: true,
  editable: true,
  wrap: false,
  cellAlignment: 'auto',
  pagination: true,
  pageSize: 10,
  selectionBar: true,
  loading: false,
  empty: false,
})
export const controls = [
  {
    kind: 'text',
    prop: 'title',
    label: 'Title',
    group: 'Content',
    initial: defaults.title,
    values: [defaults.title],
  },
  {
    kind: 'toggle',
    prop: 'showTitle',
    label: 'Show title',
    group: 'Top bar',
    initial: defaults.showTitle,
  },
  { kind: 'toggle', prop: 'search', label: 'Search', group: 'Top bar', initial: defaults.search },
  {
    kind: 'choice',
    prop: 'searchMode',
    label: 'Search scope',
    group: 'Top bar',
    initial: defaults.searchMode,
    values: ['all', 'name'],
  },
  {
    kind: 'toggle',
    prop: 'filters',
    label: 'Filters',
    group: 'Top bar',
    initial: defaults.filters,
  },
  {
    kind: 'toggle',
    prop: 'savedViews',
    label: 'Saved views',
    group: 'Top bar',
    initial: defaults.savedViews,
  },
  {
    kind: 'toggle',
    prop: 'viewOptions',
    label: 'Columns menu',
    group: 'Top bar',
    initial: defaults.viewOptions,
  },
  {
    kind: 'toggle',
    prop: 'resizableColumns',
    label: 'Resize columns',
    group: 'Columns',
    initial: defaults.resizableColumns,
  },
  {
    kind: 'toggle',
    prop: 'reorderColumns',
    label: 'Reorder columns',
    group: 'Columns',
    initial: defaults.reorderColumns,
  },
  {
    kind: 'toggle',
    prop: 'selectable',
    label: 'Row selection',
    group: 'Rows',
    initial: defaults.selectable,
  },
  {
    kind: 'toggle',
    prop: 'rowReorder',
    label: 'Reorder rows',
    group: 'Rows',
    initial: defaults.rowReorder,
  },
  {
    kind: 'toggle',
    prop: 'editable',
    label: 'Editable cells',
    group: 'Rows',
    initial: defaults.editable,
  },
  { kind: 'toggle', prop: 'wrap', label: 'Text wrap', group: 'Rows', initial: defaults.wrap },
  {
    kind: 'choice',
    prop: 'cellAlignment',
    label: 'Cell alignment',
    group: 'Rows',
    initial: defaults.cellAlignment,
    values: ['auto', 'center', 'top'],
  },
  {
    kind: 'toggle',
    prop: 'pagination',
    label: 'Pagination',
    group: 'Rows',
    initial: defaults.pagination,
  },
  {
    kind: 'choice',
    prop: 'pageSize',
    label: 'Rows per page',
    group: 'Rows',
    initial: defaults.pageSize,
    values: [5, 10, 20, 30, 50],
  },
  {
    kind: 'toggle',
    prop: 'selectionBar',
    label: 'Selection bar',
    group: 'Rows',
    initial: defaults.selectionBar,
  },
  { kind: 'toggle', prop: 'loading', label: 'Loading', group: 'State', initial: defaults.loading },
  { kind: 'toggle', prop: 'empty', label: 'Empty', group: 'State', initial: defaults.empty },
] satisfies ReadonlyArray<Control<keyof Configuration>>
export const controlsFor = (configuration: Configuration): ReadonlyArray<Control> =>
  controls.map((control) => ({
    ...control,
    enabled:
      control.prop === 'pageSize'
        ? configuration.pagination
        : control.prop === 'searchMode'
          ? configuration.search
          : control.prop === 'savedViews'
            ? configuration.filters
            : control.prop === 'selectionBar'
              ? configuration.selectable
              : true,
  }))
