import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion } from 'foldkit/message'
import { initAndInsert } from 'foldkit/binding'
import {
  sampleCode,
  CodeBlockExampleBlock,
  layer as CodeLayer,
} from '../../../registry/fluid/examples/src/code-block-example-block'
import {
  ContextMenuExampleBlock,
  layer as ContextLayer,
} from '../../../registry/fluid/examples/src/context-menu-example-block'
import {
  DataTableExampleBlock,
  layer as DataLayer,
} from '../../../registry/fluid/examples/src/data-table-example-block'
import { PreviewControlsBlock, layer as TabsLayer } from '../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../components/docs/preview-code-tabs'
import { docSection } from '../../../registry/fluid/examples/src/doc-section'
import { ComponentPresentation, presentation } from '../settings'
import { documentationRuntime } from '../documentation-runtime'
import { target } from '../motion'

const dataScenes = [
  'directory',
  'team',
  'filters',
  'views',
  'tasks',
  'columns',
  'frozen',
  'reorder',
  'files',
  'wrap',
  'sort',
  'search',
  'loading',
  'keyboard',
] as const
const tableSections: Record<(typeof dataScenes)[number], readonly [string, string]> = {
  directory: [
    'Read-only directory',
    'Follow a component link or use a column’s options to change the view.',
  ],
  team: ['Selection and actions', 'Select team members to change their role or status together.'],
  filters: ['Filters', 'Combine status, amount, customer and due-date filters on the invoices.'],
  views: [
    'Saved views',
    'Switch between views of the same people to change the filters, sorting and visible columns.',
  ],
  tasks: [
    'Editable cells',
    'Open a cell to edit its text, number, date, status or tags. Undo and redo work across cells.',
  ],
  columns: [
    'Resizing and reordering columns',
    'Drag a column header to change its position. Drag its edge to resize it.',
  ],
  frozen: [
    'Frozen columns',
    'Scroll horizontally to see the company column stay in place. Open a header menu to freeze more columns.',
  ],
  reorder: [
    'Reordering rows',
    'Drag a selected row by its handle to move the selection together. Alt and the arrow keys also move rows.',
  ],
  files: [
    'Sub-rows',
    'Expand a folder to see its files. The left and right arrows navigate the tree.',
  ],
  wrap: [
    'Wrapped text',
    'The summary wraps across lines while the other cells stay aligned to the top of the row.',
  ],
  sort: [
    'Sorting',
    'Open a header to sort either way. Shift-click a second header to sort by both columns.',
  ],
  search: [
    'Search and empty',
    'Search across the payments. Clear the search to restore the full list.',
  ],
  loading: ['Loading', 'Finish loading to replace the skeleton cells with payment data.'],
  keyboard: ['Keyboard', 'Search the 20 shortcuts or expand a group to see its keys.'],
}
const outputSample =
  '$ bun run build\n\nvite building for production…\n✓ client bundle built\n✓ server bundle built\n  wrote foldkit.build.json'
const sectionTitle = (scene: string) => dataScenes.find((key) => key === scene)
const scenesFor: (slug: string) => ReadonlyArray<string> = (slug: string) =>
  slug === 'data-table'
    ? dataScenes
    : slug === 'code-block'
      ? ['Basic', 'Highlighted', 'Output']
      : ['Basic', 'Pick what opens it', 'Keyboard', 'Disabled']
const key = Symbol('AuthoredDataComponents')
export const AuthoredDataComponentsBlock = Block.make('AuthoredDataComponents', {
  key,
  InitArgs: Schema.Tuple([Schema.String]),
  Model: Schema.Struct({
    slug: Schema.String,
    codes: Schema.Record(Schema.String, CodeBlockExampleBlock.Model),
    menus: Schema.Record(Schema.String, ContextMenuExampleBlock.Model),
    tables: Schema.Record(Schema.String, DataTableExampleBlock.Model),
    tabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof CodeBlockExampleBlock>['programRequirements']
    | Block.FactsOf<typeof ContextMenuExampleBlock>['programRequirements']
    | Block.FactsOf<typeof DataTableExampleBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly slug: string
      readonly settings: ComponentPresentation
      readonly ready: boolean
    }>(),
  },
})
const Root = AuthoredDataComponentsBlock
const Codes = Root.makeRecordBinding(CodeBlockExampleBlock, { field: 'codes' })
const Menus = Root.makeRecordBinding(ContextMenuExampleBlock, { field: 'menus' })
const Tables = Root.makeRecordBinding(DataTableExampleBlock, { field: 'tables' })
const Tabs = Root.makeRecordBinding(PreviewControlsBlock, { field: 'tabs' })
const Composition = Root.makeComposition({ bindings: [Codes, Menus, Tables, Tabs] })
export const layer = Root.makeLayer({
  init: Composition.makeInit((slug) => ({
    model: { slug, codes: {}, menus: {}, tables: {}, tabs: {} },
    steps: [
      ...scenesFor(slug).map((scene) =>
        Root.makeStep((model) =>
          initAndInsert(Tabs, model, {
            key: scene,
            args: [
              {
                id: previewCodeTabId(`${slug}-tabs`, scene),
                idPrefix: previewCodeTabId(`${slug}-tabs`, scene),
                selectedIndex: 0,
              },
            ],
          }),
        ),
      ),
      ...(slug === 'code-block'
        ? scenesFor(slug).map((scene) =>
            Root.makeStep((model) =>
              initAndInsert(Codes, model, { key: scene, args: [`docs-code-block-${scene}`] }),
            ),
          )
        : []),
      ...(slug === 'context-menu'
        ? scenesFor(slug).map((scene) =>
            Root.makeStep((model) =>
              initAndInsert(Menus, model, { key: scene, args: [`docs-context-menu-${scene}`] }),
            ),
          )
        : []),
      ...(slug === 'data-table'
        ? dataScenes.map((scene) =>
            Root.makeStep((model) =>
              initAndInsert(Tables, model, {
                key: scene,
                args: [`docs-data-table-${scene}`, scene],
              }),
            ),
          )
        : []),
      ...(slug === 'code-block' ? [Codes.requestCode('Output', { code: outputSample })] : []),
      ...(slug === 'context-menu' ? [Menus.requestDisabled('Disabled', { disabled: true })] : []),
    ],
  })),
  update: Composition.makeUpdate({}),
  inMessageUpdate: Composition.makeInMessageUpdate({
    InformedOfPresentation: Root.makeStep((model, { presentation: settings }) =>
      Update.combineSteps([
        ...Object.keys(model.tabs).map((key) =>
          Tabs.requestHoverMode(key, { mode: settings.hover }),
        ),
        ...Object.keys(model.menus).map((key) =>
          Menus.requestHoverMode(key, { mode: settings.hover }),
        ),
      ]),
    ),
  }),
  view: Composition.makeView.withInputs((model, { settings, ready }, h) => {
    if (!ready) return h.empty
    const appearance = { context: presentation(settings) }
    return h.div(
      [],
      scenesFor(model.slug).map((scene) => {
        const tab = model.tabs[scene]
        const code = model.codes[scene]
        const menu = model.menus[scene]
        const table = model.tables[scene]
        const content =
          code !== undefined
            ? h.block(
                Codes.embedView({
                  key: scene,
                  slotId: `example-${scene}`,
                  model: code,
                  viewInputs: {
                    ...appearance,
                    language: 'typescript',
                    filename: 'hello.ts',
                    lineNumbers: scene === 'Basic',
                    ...(scene === 'Highlighted'
                      ? { children: [documentationRuntime().highlightedCode(sampleCode, 'ts', h)] }
                      : {}),
                    wrap: scene === 'Output',
                    hideHeader: scene === 'Output',
                    maxHeight: scene === 'Output' ? 160 : 200,
                  },
                }),
              )
            : menu !== undefined
              ? h.block(
                  Menus.embedView({
                    key: scene,
                    slotId: `example-${scene}`,
                    model: menu,
                    viewInputs: {
                      ...appearance,
                      filteredFiles: scene === 'Pick what opens it',
                      label:
                        scene === 'Keyboard'
                          ? 'Focus here, then press Shift+F10'
                          : scene === 'Disabled'
                            ? 'Context menu disabled'
                            : 'Right-click here',
                    },
                  }),
                )
              : table !== undefined
                ? h.block(
                    Tables.embedView({
                      key: scene,
                      slotId: `example-${scene}`,
                      model: table,
                      viewInputs: {
                        ...appearance,
                      },
                    }),
                  )
                : h.empty
        const tableSection = sectionTitle(scene)
        return docSection(h, {
          title: tableSection === undefined ? scene : tableSections[tableSection][0],
          ...(tableSection === undefined ? {} : { description: tableSections[tableSection][1] }),
          source:
            documentationRuntime().sources[
              model.slug === 'code-block'
                ? 'code-block-example'
                : model.slug === 'context-menu'
                  ? 'context-menu-example'
                  : 'data-table-example'
            ],
          presentation: appearance,
          pane: tab?.tabs.selectedIndex === 1 ? 'code' : 'preview',
          tabsId: previewCodeTabId(`${model.slug}-tabs`, scene),
          tabs:
            tab === undefined
              ? h.empty
              : h.block(
                  Tabs.embedView({
                    key: scene,
                    slotId: `tabs-${scene}`,
                    model: tab,
                    viewInputs: previewCodeTabsViewInputs(h, {
                      ...appearance,
                      animate: target.node,
                      ariaLabel: `${scene} view`,
                    }),
                  }),
                ),
          className: 'w-full min-w-0',
          previewMinHeight: 200,
          children: [content],
        })
      }),
    )
  }),
}).pipe(Layer.provide(Layer.mergeAll(CodeLayer, ContextLayer, DataLayer, TabsLayer)))
