import { applyTeamAction } from './data-table-example-actions.js'
import { formatCell } from './data-table-example-format.js'
/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
import { Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { Badge } from '../../src/badge.js'
import { KeyCaps } from '../../src/key-cap.js'
import { Button } from '../../src/button.js'
import {
  DataTableBlock,
  type DataTableViewInputs,
  layer as DataTableLayer,
} from '../../src/data-table.js'
import type { Presentation } from '../../src/presentation.js'
import { Scenario, dataset, titles } from './data-table-example-data.js'

export interface DataTableExampleInputs extends Presentation {
  readonly title?: string
  readonly pageSizes?: ReadonlyArray<number>
  readonly showHistory?: boolean
  readonly search?: boolean
  readonly filters?: boolean
  readonly viewOptions?: boolean
  readonly pagination?: boolean
  readonly selectionBar?: boolean
  readonly showTitle?: boolean
  readonly searchMode?: 'all' | 'name'
  readonly savedViews?: boolean
  readonly editable?: boolean
  readonly selectable?: boolean
  readonly rowReorder?: boolean
  readonly resizableColumns?: boolean
  readonly reorderColumns?: boolean
  readonly wrap?: boolean
  readonly cellAlignment?: 'auto' | 'center' | 'top'
  readonly loading?: boolean
  readonly empty?: boolean
}
const Options = Schema.Struct({
  pageSize: Schema.Natural,
  pagination: Schema.Boolean,
  selectable: Schema.Boolean,
  editable: Schema.Boolean,
  searchMode: Schema.Literals(['all', 'name']),
  wrap: Schema.Boolean,
})
const Message = defineMessageUnion({ FinishedLoading: {} })
const key = Symbol('DataTableExample')
const Context = Schema.Struct({ id: Schema.String, scenario: Scenario })
const effects = Block.makeEffectsContract<
  never,
  Block.FactsOf<typeof DataTableBlock>['programRequirements']
>()
export const DataTableExampleBlock = Block.make('DataTableExample', {
  key,
  InitArgs: Schema.Tuple([Schema.String, Scenario]),
  ChildInitContext: Context,
  Model: Schema.Struct({
    table: DataTableBlock.Model,
    scenario: Scenario,
    loading: Schema.Boolean,
    options: Schema.OptionFromNullOr(Options),
  }),
  Message,
  InMessage: defineInMessageUnion({
    RequestedOptions: Options.fields,
  }),
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<DataTableExampleInputs>() },
})
const Root = DataTableExampleBlock
const RawTable = Root.makeRequiredFieldBinding(DataTableBlock, {
  field: 'table',
  init: { contextToArgs: ({ id, scenario }) => [dataset(id, scenario)] },
})
const Table = RawTable.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(DataTableBlock, {
    RowsChanged: Root.makeNoopStep,
    CellEdited: Root.makeNoopStep,
    SelectionChanged: Root.makeNoopStep,
    RowMoved: Root.makeNoopStep,
    RowsMoved: Root.makeNoopStep,
    ViewChanged: Root.makeNoopStep,
    ActionSelected: ({ action, ids }) =>
      Root.makeStep((model) => {
        const rows = applyTeamAction(model.table.rows, action, ids)
        return rows === undefined ? Root.makeNoopStep() : RawTable.requestRowsChange({ rows })
      }),
  }),
})
const Composition = Root.makeComposition({ bindings: [Table] })
export const layer = Root.makeLayer({
  init: Composition.makeInit((id, scenario) => ({
    childInitContext: { id, scenario },
    model: { scenario, loading: scenario === 'loading', options: Option.none() },
  })),
  update: Composition.makeUpdate({
    FinishedLoading: Root.makeFieldsStep(() => ({ loading: () => false })),
  }),
  inMessageUpdate: Composition.makeInMessageUpdate({
    RequestedOptions: Root.makeStep((model, options) => {
      const previous = Option.getOrUndefined(model.options)
      const changes: Omit<typeof DataTableBlock.InMessage.RequestedOptions.Type, '_tag'> = {
        ...(previous?.wrap === options.wrap ? {} : { lines: options.wrap ? 'wrap' : 2 }),
        ...(previous?.pageSize === options.pageSize && previous?.pagination === options.pagination
          ? {}
          : {
              pageSize: options.pagination
                ? options.pageSize
                : Math.max(1, model.table.rows.length),
            }),
        ...(previous?.selectable === options.selectable ? {} : { selectable: options.selectable }),
        ...(previous?.editable === options.editable ? {} : { editable: options.editable }),
        ...(previous?.searchMode === options.searchMode
          ? {}
          : { searchColumn: options.searchMode === 'name' ? 'name' : null }),
      }
      return Update.combineSteps([
        Root.makeFieldsStep(() => ({ options: () => Option.some(options) })),
        ...(Object.keys(changes).length === 0 ? [] : [Table.requestOptions(changes)]),
      ])
    }),
  }),
  view: Composition.makeView.withInputs((model, inputs, h) => {
    const scenario = model.scenario
    const catalogue = scenario === 'catalogue'
    const home = scenario === 'showcase'
    const payments = scenario === 'sort' || scenario === 'search' || scenario === 'loading'
    const title = inputs.title ?? titles[scenario]
    const lines: Pick<DataTableViewInputs, 'lines'> =
      inputs.wrap === undefined ? {} : { lines: inputs.wrap ? 'wrap' : 2 }
    return h.div(
      [h.Class('w-full min-w-0')],
      [
        ...(inputs.loading === undefined && model.loading
          ? [
              Button(
                {
                  ...inputs,
                  variant: 'secondary',
                  children: ['Finish loading'],
                  attributes: [h.OnClick(Message.FinishedLoading())],
                },
                h,
              ),
            ]
          : []),
        h.block(
          Table.embedView({
            slotId: 'grid',
            model: model.table,
            viewInputs: {
              ...inputs,
              title: (inputs.showTitle ?? !home) ? title : '',
              label: title,
              loading: inputs.loading ?? model.loading,
              empty: inputs.empty ?? false,
              editable: inputs.editable ?? !home,
              draggable: inputs.rowReorder ?? (catalogue || scenario === 'reorder'),
              resizableColumns: inputs.resizableColumns ?? (!home && scenario !== 'directory'),
              reorderColumns: inputs.reorderColumns ?? scenario !== 'directory',
              savedViews: inputs.savedViews ?? (catalogue || scenario === 'views'),
              cellAlignment: inputs.cellAlignment ?? 'auto',
              ...lines,
              ...(home || inputs.searchMode === 'name' ? { searchColumn: 'name' } : {}),
              pageSizes: inputs.pageSizes ?? (home ? [8, 16, 32] : [5, 10, 20, 30, 50]),
              showHistory: inputs.showHistory ?? !home,
              ...(home
                ? {
                    emptyTitle: 'No components match',
                    emptyDescription: 'Try a name like Dialog or Tabs.',
                  }
                : {}),
              renderCell: ({ row, column, value }) => {
                if (scenario === 'directory' && column.id !== 'group' && typeof value === 'string')
                  return h.a(
                    [
                      h.Href('/components/' + value.toLowerCase()),
                      h.Class(
                        'rounded-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-(--focus-ring)',
                      ),
                    ],
                    [value],
                  )
                if (
                  scenario === 'keyboard' &&
                  column.id === 'keys' &&
                  row.parentId &&
                  typeof value === 'string'
                ) {
                  return h.span(
                    [h.Class('flex flex-wrap items-center gap-x-1.5 gap-y-1')],
                    value
                      .split(' / ')
                      .flatMap((combo, index) => [
                        ...(index
                          ? [h.span([h.Class('text-site-caption text-muted-foreground')], ['/'])]
                          : []),
                        KeyCaps({ keys: combo.split(' + ') }, h),
                      ]),
                  )
                }
                if (home && column.id === 'primitives' && typeof value === 'string')
                  return h.span(
                    [h.Class('flex h-[1lh] items-center')],
                    [
                      Badge(
                        {
                          ...inputs,
                          variant: 'ghost',
                          color: value === 'Radix + Base UI' ? 'blue' : 'gray',
                          children: [value],
                        },
                        h,
                      ),
                    ],
                  )
                if (home && column.id === 'props')
                  return h.span([h.Class('tabular-nums')], [String(value ?? '')])
                const text = formatCell(scenario, column, value)
                return text === undefined
                  ? undefined
                  : h.span(
                      home && column.id === 'added'
                        ? [h.Class('tabular-nums whitespace-nowrap')]
                        : [],
                      [text],
                    )
              },
              showSearch:
                inputs.search ??
                (home || catalogue || ['team', 'files', 'keyboard', 'search'].includes(scenario)),
              searchCollapsible: !payments,
              searchPlaceholder:
                catalogue || home
                  ? 'Search components…'
                  : payments
                    ? 'Search payments…'
                    : `Search ${title.toLowerCase()}…`,
              showFilters:
                inputs.filters ??
                (catalogue || ['team', 'filters', 'views', 'tasks'].includes(scenario)),
              showViewOptions:
                inputs.viewOptions ??
                (home || catalogue || ['views', 'columns', 'frozen'].includes(scenario)),
              showPagination:
                inputs.empty === true
                  ? false
                  : (inputs.pagination ?? (home || catalogue || scenario === 'team')),
              showSelectionBar:
                inputs.selectionBar ?? (catalogue || scenario === 'team' || scenario === 'tasks'),
            },
          }),
        ),
      ],
    )
  }),
}).pipe(Layer.provide(DataTableLayer))
